import { getUploadsCollection } from '@naija-bi/mongo-client';
import type { UploadRecord } from '@naija-bi/mongo-client';

export async function save(
  upload: Omit<UploadRecord, '_id'>
): Promise<UploadRecord> {
  const result = await getUploadsCollection().insertOne(upload as UploadRecord);
  return { ...upload, _id: result.insertedId.toString() };
}

export async function findById(id: string): Promise<UploadRecord | null> {
  const { ObjectId } = await import('mongodb');
  const doc = await getUploadsCollection().findOne({ _id: new ObjectId(id) as unknown as string });
  return doc;
}
