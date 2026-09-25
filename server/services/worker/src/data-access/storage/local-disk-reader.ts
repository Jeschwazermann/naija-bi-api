import { promises as fs } from 'fs';
import type { StorageReader } from './storage-reader';

export class LocalDiskStorageReader implements StorageReader {
  async readFile(url: string): Promise<Buffer> {
    // local disk URLs are written as local:///absolute/path by upload-api
    const filePath = url.replace('local://', '');
    return fs.readFile(filePath);
  }
}
