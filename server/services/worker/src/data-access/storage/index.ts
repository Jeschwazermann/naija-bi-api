import type { AppConfig } from '../../config';
import type { StorageReader } from './storage-reader';
import { LocalDiskStorageReader } from './local-disk-reader';
import { S3StorageReader } from './s3-reader';

export function createStorageReader(config: AppConfig): StorageReader {
  if (config.storageDriver === 's3') {
    return new S3StorageReader(config.s3Region);
  }
  return new LocalDiskStorageReader();
}

export type { StorageReader } from './storage-reader';
