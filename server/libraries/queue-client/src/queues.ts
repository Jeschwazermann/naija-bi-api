import { Queue, type JobsOptions } from 'bullmq';
import { getRedisConnection } from './connection';

export const QUEUE_NAMES = {
  processUpload: 'process-upload',
} as const;

export interface ProcessUploadJobData {
  uploadId: string;
  businessId: string;
  fileUrl: string;
}

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { age: 60 * 60 * 24 * 7 }, // keep 7 days for debugging
  removeOnFail: false, // failed jobs stay — they double as the dead-letter list
};

export function createProcessUploadQueue(redisUrl: string): Queue<ProcessUploadJobData> {
  const connection = getRedisConnection(redisUrl);
  return new Queue<ProcessUploadJobData>(QUEUE_NAMES.processUpload, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}
