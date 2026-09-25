import { createProcessUploadQueue, type ProcessUploadJobData } from '@naija-bi/queue-client';
import type { AppConfig } from '../config';

let queue: ReturnType<typeof createProcessUploadQueue> | undefined;

function getProcessUploadQueue(config: AppConfig) {
  if (!queue) queue = createProcessUploadQueue(config.redisUrl);
  return queue;
}

export async function enqueueProcessUploadJob(
  config: AppConfig,
  data: ProcessUploadJobData
): Promise<void> {
  await getProcessUploadQueue(config).add('process-upload', data, {
    jobId: data.uploadId, // ✅ Best Practice: idempotent enqueue — re-uploading the same
    // uploadId won't create a duplicate job.
  });
}

export async function closeProcessUploadQueue(): Promise<void> {
  const activeQueue = queue;
  queue = undefined;
  await activeQueue?.close();
}
