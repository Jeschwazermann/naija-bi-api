import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '@naija-bi/error-handling';

export interface AuthenticatedRequest extends Request {
  businessId?: string;
}

// ✅ Best Practice: auth middleware lives at the entry-points layer — it
// only extracts and validates the token, domain code never touches jsonwebtoken.
export function createAuthMiddleware(jwtSecret: string) {
  return function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      next(new AppError('unauthorized', 'Missing bearer token', 401, false));
      return;
    }
    try {
      const token = header.slice('Bearer '.length);
      const payload = jwt.verify(token, jwtSecret) as { businessId: string };
      req.businessId = payload.businessId;
      next();
    } catch {
      next(new AppError('unauthorized', 'Invalid or expired token', 401, false));
    }
  };
}
