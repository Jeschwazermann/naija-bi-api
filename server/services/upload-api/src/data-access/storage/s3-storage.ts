import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { StorageClient, SavedFile } from './storage-client';

// ✅ Best Practice: S3-compatible adapter — works with AWS S3 or any
// S3-compatible provider by overriding the endpoint if needed.
export class S3StorageClient implements StorageClient {
  #client: S3Client;

  #bucket: string;

  constructor(bucket: string, region: string) {
    this.#bucket = bucket;
    this.#client = new S3Client({ region });
  }

  async saveFile(buffer: Buffer, key: string): Promise<SavedFile> {
    await this.#client.send(
      new PutObjectCommand({ Bucket: this.#bucket, Key: key, Body: buffer })
    );
    return { url: `s3://${this.#bucket}/${key}` };
  }
}
