import { getBusinessesCollection } from '@naija-bi/mongo-client';
import type { BusinessRecord } from '@naija-bi/mongo-client';

export async function findByEmail(email: string): Promise<BusinessRecord | null> {
  return getBusinessesCollection().findOne({ email: email.toLowerCase() });
}

export async function findById(id: string): Promise<BusinessRecord | null> {
  const { ObjectId } = await import('mongodb');
  return getBusinessesCollection().findOne({ _id: new ObjectId(id) as unknown as string });
}

export async function save(business: Omit<BusinessRecord, '_id'>): Promise<BusinessRecord> {
  const result = await getBusinessesCollection().insertOne(business as BusinessRecord);
  return { ...business, _id: result.insertedId.toString() };
}
