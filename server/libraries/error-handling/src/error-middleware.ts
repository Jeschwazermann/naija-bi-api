import type { NextFunction, Request, Response } from 'express';
import type { Logger } from '@naija-bi/logger';
import { isAppError } from './app-error';

// ✅ Best Practice: centralized error handler — the only place that decides
// HTTP status + response shape for errors, and the only place that logs them.
export function createErrorMiddleware(logger: Logger) {
  return function errorMiddleware(
    error: unknown,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
  ): void {
    const requestId = (req as Request & { id?: string }).id;

    if (isAppError(error)) {
      logger.error(error.message, {
        requestId,
        code: error.code,
        isCatastrophic: error.isCatastrophic,
      });
      res.status(error.httpCode).json({ error: error.code, message: error.message });
      return;
    }

    const err = error as Error;
    logger.error('unhandled-error', { requestId, message: err?.message, stack: err?.stack });
    res.status(500).json({ error: 'internal-error', message: 'Something went wrong' });
  };
}
