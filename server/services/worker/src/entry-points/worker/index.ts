import { Worker } from 'bullmq';
import { createServer, type Server } from 'node:http';
import { createLogger, type LoggerConfiguration } from '@naija-bi/logger';
import {
  connectMongo,
  ensureIndexes,
  closeMongo,
  pingMongo,
} from '@naija-bi/mongo-client';
import {
  getRedisConnection,
  closeRedisConnection,
  pingRedis,
  QUEUE_NAMES,
} from '@naija-bi/queue-client';
import type { ProcessUploadJobData } from '@naija-bi/queue-client';
import { config } from '../../config';
import { createStorageReader } from '../../data-access/storage';
import { createProcessUploadProcessor } from './processors/process-upload-processor';

const logger = createLogger({
  level: config.logLevel as LoggerConfiguration['level'],
  prettyPrint: config.nodeEnv === 'development',
  serviceName: 'worker',
});

// ✅ Best Practice: export start/stop so tests can control the worker's lifecycle.
export async function startWorker(): Promise<Worker<ProcessUploadJobData>> {
  await connectMongo(config.mongoUrl);
  await ensureIndexes();

  const connection = getRedisConnection(config.redisUrl);
  const storageReader = createStorageReader(config);
  const processor = createProcessUploadProcessor(storageReader, logger);

  const worker = new Worker<ProcessUploadJobData>(
    QUEUE_NAMES.processUpload,
    processor,
    {
      connection,
      concurrency: config.concurrency,
    }
  );
  await worker.waitUntilReady();

  worker.on('completed', (job) => {
    logger.info('job completed', {
      jobId: job.id,
      uploadId: job.data.uploadId,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error('job failed', {
      jobId: job?.id,
      uploadId: job?.data.uploadId,
      attemptsMade: job?.attemptsMade,
      message: err.message,
    });
  });

  logger.info('worker started', { concurrency: config.concurrency });
  return worker;
}

//healthcheck server for liveness and readiness probes
export function startHealthServer(): Promise<Server> {
  const server = createServer(async (req, res) => {
    if (req.url !== '/health') {
      res.writeHead(404).end();
      return;
    }
    try {
      await Promise.all([pingMongo(), pingRedis(config.redisUrl)]);
      res
        .writeHead(200, { 'content-type': 'application/json' })
        .end('{"status":"ok"}');
    } catch {
      res
        .writeHead(503, { 'content-type': 'application/json' })
        .end('{"status":"unavailable"}');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    const port = process.env.NODE_ENV === 'test' ? 0 : config.healthPort;
    server.listen(port, '0.0.0.0', () => {
      server.removeListener('error', reject);
      resolve(server);
    });
  });
}

async function gracefulShutdown(worker: Worker, healthServer: Server) {
  logger.info('shutting down worker');
  await new Promise<void>((resolve) => healthServer.close(() => resolve()));
  await worker.close();
  await closeRedisConnection();
  await closeMongo();
  process.exit(0);
}

if (require.main === module) {
  startWorker().then(async (worker) => {
    const healthServer = await startHealthServer();
    process.on('SIGTERM', () => gracefulShutdown(worker, healthServer));
    process.on('SIGINT', () => gracefulShutdown(worker, healthServer));
    process.on('uncaughtException', (err) => {
      logger.error('uncaughtException', {
        message: err.message,
        stack: err.stack,
      });
      process.exit(1);
    });
    process.on('unhandledRejection', (reason) => {
      logger.error('unhandledRejection', { reason: String(reason) });
      process.exit(1);
    });
  });
}
