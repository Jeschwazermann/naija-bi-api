import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createLogger, type LoggerConfiguration } from '@naija-bi/logger';
import { createErrorMiddleware } from '@naija-bi/error-handling';
import {
  connectMongo,
  ensureIndexes,
  closeMongo,
  pingMongo,
} from '@naija-bi/mongo-client';
import { config } from '../../config';
import { createRoutes } from './routes';

const logger = createLogger({
  level: config.logLevel as LoggerConfiguration['level'],
  prettyPrint: config.nodeEnv === 'development',
  serviceName: 'auth-api',
});

export async function startWebServer() {
  await connectMongo(config.mongoUrl);
  await ensureIndexes();

  const app = express();
  app.use(helmet());
  app.use(
    cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin })
  );
  app.use(express.json());

  //healthcheck
  app.get('/health', async (_req, res) => {
    try {
      await pingMongo();
      res.status(200).json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  // ✅ Best Practice: no auth middleware here — this service issues tokens,
  // it can't require one to do so. /auth/register and /auth/login are
  // intentionally the only public routes in the whole system.
  app.use('/', createRoutes(config, logger));
  app.use(createErrorMiddleware(logger));

  const port = process.env.NODE_ENV === 'test' ? 0 : config.port;
  const server = app.listen(port, () => {
    logger.info('auth-api listening', { port: config.port });
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
  await closeMongo();
}

async function gracefulShutdown(server: import('http').Server) {
  logger.info('shutting down auth-api');
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
