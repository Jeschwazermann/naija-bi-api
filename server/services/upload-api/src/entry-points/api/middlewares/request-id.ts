import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

// ✅ Best Practice: reuse an upstream x-request-id (from a load balancer /
// API gateway) when present, instead of always minting a new one.
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming || randomUUID();
  (req as Request & { id: string }).id = id;
  res.setHeader('x-request-id', id);
  next();
}
