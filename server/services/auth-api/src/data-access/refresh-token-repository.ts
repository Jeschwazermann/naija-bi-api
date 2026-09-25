import { getRefreshTokensCollection } from '@naija-bi/mongo-client';
import type { RefreshTokenRecord } from '@naija-bi/mongo-client';

export async function save(record: Omit<RefreshTokenRecord, '_id'>): Promise<void> {
  await getRefreshTokensCollection().insertOne(record as RefreshTokenRecord);
}

// ✅ Best Practice: "valid" is checked in one place — not revoked, not
// past expiry — every caller (refresh, logout) shares this definition.
export async function findValidByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
  return getRefreshTokensCollection().findOne({
    tokenHash,
    revoked: false,
    expiresAt: { $gt: new Date() },
  });
}

export async function revokeByHash(tokenHash: string): Promise<void> {
  await getRefreshTokensCollection().updateOne({ tokenHash }, { $set: { revoked: true } });
}
