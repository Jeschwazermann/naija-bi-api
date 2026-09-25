import type { AppConfig } from '../../config';
import type { StorageClient } from './storage-client';
import { LocalDiskStorageClient } from './local-disk-storage';
import { S3StorageClient } from './s3-storage';

// ✅ Best Practice: factory picks the adapter from config so nothing else
// in the codebase needs an if/else on storageDriver.
export function createStorageClient(config: AppConfig): StorageClient {
  if (config.storageDriver === 's3') {
    return new S3StorageClient(config.s3Bucket, config.s3Region);
  }
  return new LocalDiskStorageClient(config.storageLocalPath);
}

export type { StorageClient, SavedFile } from './storage-client';
