import { Router } from 'express';
import * as summaryUseCase from '../../domain/use-cases/get-summary-use-case';
import type { AuthenticatedRequest } from './middlewares/authenticate';

export function createRoutes(): Router {
  const router = Router();

  router.get('/analytics/summary', async (req: AuthenticatedRequest, res, next) => {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      const result = await summaryUseCase.getSummary(req.businessId as string, from, to);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/analytics/trend', async (req: AuthenticatedRequest, res, next) => {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      const result = await summaryUseCase.getTrend(req.businessId as string, from, to);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/analytics/top-products', async (req: AuthenticatedRequest, res, next) => {
    try {
      const { from, to, limit } = req.query as { from?: string; to?: string; limit?: string };
      const result = await summaryUseCase.getTopProducts(req.businessId as string, from, to, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
