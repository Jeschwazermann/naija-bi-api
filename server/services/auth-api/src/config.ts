import convict from 'convict';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../../..', '.env'), quiet: true });

const schema = convict({
  port: {
    doc: 'HTTP port the auth API listens on',
    format: 'port',
    default: 4100,
    env: 'AUTH_API_PORT',
  },
  mongoUrl: {
    doc: 'MongoDB connection string',
    format: String,
    default: 'mongodb://localhost:27017/naija_bi',
    env: 'MONGODB_URL',
  },
  // ✅ Best Practice: this MUST be the same secret + issuer used by
  // upload-api and analytics-api to verify tokens — they don't call this
  // service, they just trust tokens signed with the shared secret.
  jwtSecret: {
    doc: 'Secret used to sign business auth tokens',
    format: String,
    default: 'change-me-in-production',
    env: 'JWT_SECRET',
    sensitive: true,
  },
  accessTokenExpiresIn: {
    doc: 'How long an access token stays valid — short-lived by design',
    format: String,
    default: '15m',
    env: 'ACCESS_TOKEN_EXPIRES_IN',
  },
  refreshTokenExpiresInDays: {
    doc: 'How long a refresh token stays valid before it must be used to log in again',
    format: 'nat',
    default: 30,
    env: 'REFRESH_TOKEN_EXPIRES_IN_DAYS',
  },
  corsOrigin: {
    doc: 'Origin allowed to call this API from a browser (the dashboard). "*" allows any — fine for local dev only.',
    format: String,
    default: '*',
    env: 'CORS_ORIGIN',
  },
  bcryptSaltRounds: {
    doc: 'Cost factor for password hashing',
    format: 'nat',
    default: 10,
    env: 'BCRYPT_SALT_ROUNDS',
  },
  logLevel: {
    doc: 'Log verbosity',
    format: ['debug', 'info', 'warn', 'error'],
    default: 'info',
    env: 'LOGGER_LEVEL',
  },
  nodeEnv: {
    doc: 'Environment mode',
    format: ['development', 'test', 'production'],
    default: 'production',
    env: 'NODE_ENV',
  },
});

schema.validate({ allowed: 'strict' });

export const config = schema.getProperties();
export type AppConfig = typeof config;
