import { AppError } from '@naija-bi/error-handling';
import { hashRefreshToken } from '../services/token-service';
import { issueTokenPair } from './issue-token-pair';
import * as refreshTokenRepository from '../../data-access/refresh-token-repository';
import * as businessRepository from '../../data-access/business-repository';
import type { AppConfig } from '../../config';

// ✅ Best Practice: rotation — the refresh token just used is revoked
// immediately, and a brand new one is issued alongside the new access
// token. If a stolen refresh token is ever used by an attacker, the
// legitimate owner's next refresh attempt will fail (their token was
// already rotated away), which is a detectable signal something is wrong —
// a non-rotating refresh token gives no such signal.
export async function refreshTokens(rawRefreshToken: string | undefined, config: AppConfig) {
  if (!rawRefreshToken) {
    throw new AppError('missing-refresh-token', 'refreshToken is required', 400, false);
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const record = await refreshTokenRepository.findValidByHash(tokenHash);
  if (!record) {
    throw new AppError('invalid-refresh-token', 'Refresh token is invalid or expired', 401, false);
  }

  await refreshTokenRepository.revokeByHash(tokenHash);

  const business = await businessRepository.findById(record.businessId);
  if (!business) {
    throw new AppError('invalid-refresh-token', 'Refresh token is invalid or expired', 401, false);
  }

  const { accessToken, refreshToken } = await issueTokenPair(business, config);
  return { accessToken, refreshToken };
}
