import { Router } from 'express';
import multer from 'multer';
import type { Logger } from '@naija-bi/logger';
import { createUpload } from '../../domain/use-cases/create-upload-use-case';
import { getUploadStatus } from '../../domain/use-cases/get-upload-status-use-case';
import { createStorageClient } from '../../data-access/storage';
import type { AppConfig } from '../../config';
import type { AuthenticatedRequest } from './middlewares/authenticate';

export function createRoutes(config: AppConfig, logger: Logger): Router {
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage() });
  const storageClient = createStorageClient(config);

  // Route handlers stay thin — parse request, call domain, send response.
  router.post('/uploads', upload.single('file'), async (req: AuthenticatedRequest, res, next) => {
    try {
      logger.info('POST /uploads called', { businessId: req.businessId });
      const result = await createUpload(
        { businessId: req.businessId as string, file: req.file as Express.Multer.File },
        storageClient,
        config
      );
      res.status(202).json({ uploadId: result._id, status: result.status });
    } catch (error) {
      next(error);
    }
  });

  router.get('/uploads/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
      const uploadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await getUploadStatus(uploadId, req.businessId as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
