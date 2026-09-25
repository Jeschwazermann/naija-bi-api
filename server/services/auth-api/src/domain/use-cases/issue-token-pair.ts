import {
  issueAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../services/token-service';
import * as refreshTokenRepository from '../../data-access/refresh-token-repository';
import type { AppConfig } from '../../config';
import type { BusinessRecord } from '@naija-bi/mongo-client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ✅ Best Practice: the one place that mints a token pair — register,
// login, and refresh all call this instead of each rolling their own.
export async function issueTokenPair(business: BusinessRecord, config: AppConfig): Promise<TokenPair> {
  const accessToken = issueAccessToken(
    { businessId: business._id as string, businessName: business.businessName },
    config.jwtSecret,
    config.accessTokenExpiresIn
  );

  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + config.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000);
  await refreshTokenRepository.save({
    businessId: business._id as string,
    tokenHash: hashRefreshToken(refreshToken),
    createdAt: new Date(),
    expiresAt,
    revoked: false,
  });

  return { accessToken, refreshToken };
}
