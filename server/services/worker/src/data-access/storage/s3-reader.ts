import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import type { StorageReader } from './storage-reader';

export class S3StorageReader implements StorageReader {
  #client: S3Client;

  constructor(region: string) {
    this.#client = new S3Client({ region });
  }

  async readFile(url: string): Promise<Buffer> {
    // s3://bucket/key
    const [, , bucket, ...keyParts] = url.split('/');
    const key = keyParts.join('/');
    const response = await this.#client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}
