import { Router } from 'express';
import type { Logger } from '@naija-bi/logger';
import { registerBusiness } from '../../domain/use-cases/register-business-use-case';
import { login } from '../../domain/use-cases/login-use-case';
import { refreshTokens } from '../../domain/use-cases/refresh-tokens-use-case';
import { logout } from '../../domain/use-cases/logout-use-case';
import type { AppConfig } from '../../config';
import { loginRateLimiter } from './middlewares/login-rate-limiter';

export function createRoutes(config: AppConfig, logger: Logger): Router {
  const router = Router();

  router.post('/auth/register', async (req, res, next) => {
    try {
      const result = await registerBusiness(req.body, config);
      logger.info('business registered', { businessId: result.businessId });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/auth/login', loginRateLimiter, async (req, res, next) => {
    try {
      const result = await login(req.body, config);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  // ✅ Best Practice: the access token is deliberately short-lived (15m
  // default) — the dashboard calls this whenever a request comes back 401,
  // trading the refresh token for a new pair, rather than the client
  // holding one long-lived, harder-to-revoke token.
  router.post('/auth/refresh', async (req, res, next) => {
    try {
      const result = await refreshTokens(req.body?.refreshToken, config);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/auth/logout', async (req, res, next) => {
    try {
      await logout(req.body?.refreshToken);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
