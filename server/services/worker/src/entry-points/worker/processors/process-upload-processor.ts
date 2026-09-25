import type { Job } from 'bullmq';
import type { Logger } from '@naija-bi/logger';
import type { ProcessUploadJobData } from '@naija-bi/queue-client';
import { processUpload } from '../../../domain/use-cases/process-upload-use-case';
import type { StorageReader } from '../../../data-access/storage';

// ✅ Best Practice: throwing here lets BullMQ's retry/backoff handle
// transient failures (e.g. Mongo blip) — don't swallow errors in a processor.
export function createProcessUploadProcessor(storageReader: StorageReader, logger: Logger) {
  return async function processUploadJob(job: Job<ProcessUploadJobData>): Promise<void> {
    logger.info('processing upload job', { jobId: job.id, uploadId: job.data.uploadId });
    await processUpload(job.data, storageReader, logger);
  };
}
