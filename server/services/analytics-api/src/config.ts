import convict from 'convict';

const schema = convict({
  port: {
    doc: 'HTTP port the analytics API listens on',
    format: 'port',
    default: 4200,
    env: 'ANALYTICS_API_PORT',
  },
  mongoUrl: {
    doc: 'MongoDB connection string',
    format: String,
    default: 'mongodb://localhost:27017/csv-upload',
    env: 'MONGODB_URL',
  },
  jwtSecret: {
    doc: 'Secret used to verify business auth tokens',
    format: String,
    default: 'change-me-in-production',
    env: 'JWT_SECRET',
    sensitive: true,
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
  corsOrigin: {
    doc: 'Origin allowed to call this API from a browser (the dashboard). "*" allows any — fine for local dev only.',
    format: String,
    default: '*',
    env: 'CORS_ORIGIN',
  },
});

schema.validate({ allowed: 'strict' });

export const config = schema.getProperties();
export type AppConfig = typeof config;
