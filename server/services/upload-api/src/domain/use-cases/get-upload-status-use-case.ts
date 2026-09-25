import { AppError } from '@naija-bi/error-handling';
import * as uploadRepository from '../../data-access/upload-repository';
import type { UploadRecord } from '@naija-bi/mongo-client';

export async function getUploadStatus(uploadId: string, businessId: string): Promise<UploadRecord> {
  const upload = await uploadRepository.findById(uploadId);
  if (!upload || upload.businessId !== businessId) {
    throw new AppError('upload-not-found', 'Upload not found', 404, false);
  }
  return upload;
}
