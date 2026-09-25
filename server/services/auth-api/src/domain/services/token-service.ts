import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface TokenClaims {
  businessId: string;
  businessName: string;
}

// ✅ Best Practice: token shape (claims) is defined once here — the
// authenticate middlewares in upload-api / analytics-api only read
// businessId back out, but keep claim names in sync if you extend this.
export function issueAccessToken(claims: TokenClaims, jwtSecret: string, expiresIn: string): string {
  return jwt.sign(claims, jwtSecret, { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] });
}

// ✅ Best Practice: the refresh token is an opaque random string, not a
// JWT. Only its SHA-256 hash is ever stored — a leaked database dump can't
// be used to log in as anyone, and a stolen token can be revoked by
// deleting/flagging its one matching row (a JWT refresh token couldn't be
// revoked without a separate blocklist anyway, so opaque is strictly simpler).
export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
