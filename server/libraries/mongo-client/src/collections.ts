import type { Collection } from 'mongodb';
import { getDb } from './client';
import type {
  UploadRecord,
  SalesRow,
  SalesAggregate,
  BusinessRecord,
  RefreshTokenRecord,
} from './types';

export const COLLECTION_NAMES = {
  uploads: 'uploads',
  salesRaw: 'sales_raw',
  salesAggregates: 'sales_aggregates',
  businesses: 'businesses',
  refreshTokens: 'refresh_tokens',
} as const;

export function getBusinessesCollection(): Collection<BusinessRecord> {
  return getDb().collection<BusinessRecord>(COLLECTION_NAMES.businesses);
}

export function getRefreshTokensCollection(): Collection<RefreshTokenRecord> {
  return getDb().collection<RefreshTokenRecord>(COLLECTION_NAMES.refreshTokens);
}

export function getUploadsCollection(): Collection<UploadRecord> {
  return getDb().collection<UploadRecord>(COLLECTION_NAMES.uploads);
}

export function getSalesRawCollection(): Collection<SalesRow> {
  return getDb().collection<SalesRow>(COLLECTION_NAMES.salesRaw);
}

export function getSalesAggregatesCollection(): Collection<SalesAggregate> {
  return getDb().collection<SalesAggregate>(COLLECTION_NAMES.salesAggregates);
}

// ✅ Best Practice: index setup lives with the collections it indexes,
// called once from each service's bootstrap after connecting.
export async function ensureIndexes(): Promise<void> {
  await getUploadsCollection().createIndex({ businessId: 1, uploadedAt: -1 });
  await getUploadsCollection().createIndex({ fileHash: 1 }, { unique: false });
  await getSalesRawCollection().createIndex({ businessId: 1, date: 1 });
  await getSalesRawCollection().createIndex({ uploadId: 1 });
  await getSalesAggregatesCollection().createIndex(
    { businessId: 1, date: 1 },
    { unique: true }
  );
  await getBusinessesCollection().createIndex({ email: 1 }, { unique: true });
  await getRefreshTokensCollection().createIndex({ tokenHash: 1 }, { unique: true });
  // ✅ Best Practice: TTL index — Mongo deletes the document itself once
  // expiresAt passes, so expired refresh tokens never need manual cleanup.
  await getRefreshTokensCollection().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
