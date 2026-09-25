import { hashRefreshToken } from '../services/token-service';
import * as refreshTokenRepository from '../../data-access/refresh-token-repository';

// ✅ Best Practice: logout is idempotent and never errors on an
// already-invalid token — from the client's perspective "log me out" should
// always succeed, whether or not the token was still valid server-side.
export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;
  await refreshTokenRepository.revokeByHash(hashRefreshToken(rawRefreshToken));
}
