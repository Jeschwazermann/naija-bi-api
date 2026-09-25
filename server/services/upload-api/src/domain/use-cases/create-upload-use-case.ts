import crypto from 'crypto';
import { assertUploadFileIsValid } from '../validators/upload-validator';
import * as uploadRepository from '../../data-access/upload-repository';
import { enqueueProcessUploadJob } from '../../data-access/queue-producer';
import type { StorageClient } from '../../data-access/storage';
import type { AppConfig } from '../../config';
import type { UploadRecord } from '@naija-bi/mongo-client';

interface CreateUploadDTO {
  businessId: string;
  file: { buffer: Buffer; mimetype: string; size: number; originalname: string };
}

// ✅ Best Practice: use case is the table of contents for the feature —
// each line delegates, the real work lives in the functions it calls.
export async function createUpload(
  dto: CreateUploadDTO,
  storageClient: StorageClient,
  config: AppConfig
): Promise<UploadRecord> {
  assertUploadFileIsValid(dto.file, config.maxUploadSizeMb);

  const fileHash = crypto.createHash('sha256').update(dto.file.buffer).digest('hex');
  const key = `${dto.businessId}/${crypto.randomUUID()}-${dto.file.originalname}`;
  const { url } = await storageClient.saveFile(dto.file.buffer, key);

  const upload = await uploadRepository.save({
    businessId: dto.businessId,
    fileUrl: url,
    fileHash,
    originalFilename: dto.file.originalname,
    status: 'queued',
    rowsProcessed: 0,
    rowsRejected: 0,
    uploadedAt: new Date(),
  });

  await enqueueProcessUploadJob(config, {
    uploadId: upload._id as string,
    businessId: dto.businessId,
    fileUrl: url,
  });

  return upload;
}
