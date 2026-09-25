import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createLogger, type LoggerConfiguration } from '@naija-bi/logger';
import { createErrorMiddleware } from '@naija-bi/error-handling';
import { connectMongo, ensureIndexes, closeMongo, pingMongo } from '@naija-bi/mongo-client';
import { closeRedisConnection, pingRedis } from '@naija-bi/queue-client';
import { config } from '../../config';
import { requestId } from './middlewares/request-id';
import { createAuthMiddleware } from './middlewares/authenticate';
import { createRoutes } from './routes';
import { closeProcessUploadQueue } from '../../data-access/queue-producer';

const logger = createLogger({
  level: config.logLevel as LoggerConfiguration['level'],
  prettyPrint: config.nodeEnv === 'development',
  serviceName: 'upload-api',
});

// ✅ Best Practice: export start/stop to give tests explicit lifecycle control.
export async function startWebServer() {
  await connectMongo(config.mongoUrl);
  await ensureIndexes();

  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin }));
  app.use(requestId);
  app.use(express.json());
  app.get('/health', async (_req, res) => {
    try {
      await Promise.all([pingMongo(), pingRedis(config.redisUrl)]);
      res.status(200).json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  app.use(createAuthMiddleware(config.jwtSecret));
  app.use('/', createRoutes(config, logger));
  app.use(createErrorMiddleware(logger));

  // ✅ Best Practice: port 0 in tests = ephemeral port, avoids collisions
  // between parallel test workers.
  const port = process.env.NODE_ENV === 'test' ? 0 : config.port;
  const server = app.listen(port, () => {
    logger.info('upload-api listening', { port: config.port });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  return server;
}

export async function stopWebServer(server: import('http').Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await closeProcessUploadQueue();
  await closeRedisConnection();
  await closeMongo();
}

async function gracefulShutdown(server: import('http').Server) {
  logger.info('shutting down upload-api');
  server.close(async () => {
    await closeMongo();
    process.exit(0);
  });
}

if (require.main === module) {
  startWebServer().then((server) => {
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));
    process.on('uncaughtException', (err) => {
      logger.error('uncaughtException', { message: err.message, stack: err.stack });
      process.exit(1);
    });
    process.on('unhandledRejection', (reason) => {
      logger.error('unhandledRejection', { reason: String(reason) });
      process.exit(1);
    });
  });
}
