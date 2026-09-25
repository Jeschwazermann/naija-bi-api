import { promises as fs } from 'fs';
import path from 'path';
import type { StorageClient, SavedFile } from './storage-client';

// ✅ Best Practice: local-disk adapter for development only — swap for
// S3StorageClient in any shared/staging/production environment.
export class LocalDiskStorageClient implements StorageClient {
  #basePath: string;

  constructor(basePath: string) {
    this.#basePath = basePath;
  }

  async saveFile(buffer: Buffer, key: string): Promise<SavedFile> {
    await fs.mkdir(this.#basePath, { recursive: true });
    const fullPath = path.join(this.#basePath, key);
    await fs.writeFile(fullPath, buffer);
    return { url: `local://${fullPath}` };
  }
}
