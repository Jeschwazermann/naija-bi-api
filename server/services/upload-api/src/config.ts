import convict from 'convict';

const schema = convict({
  port: {
    doc: 'HTTP port the upload API listens on',
    format: 'port',
    default: 4000,
    env: 'UPLOAD_API_PORT',
  },
  mongoUrl: {
    doc: 'MongoDB connection string',
    format: String,
    default: 'mongodb://localhost:27017/csv-upload',
    env: 'MONGODB_URL',
  },
  redisUrl: {
    doc: 'Redis connection string used for the job queue',
    format: String,
    default: 'redis://localhost:6379',
    env: 'REDIS_URL',
  },
  jwtSecret: {
    doc: "Secret used to verify business auth tokens. Don't use in production.",
    format: String,
    default: 'change-me-in-production',
    env: 'JWT_SECRET',
    sensitive: true,
  },
  storageDriver: {
    doc: 'Where uploaded CSV files are stored',
    format: ['local', 's3'],
    default: 'local',
    env: 'STORAGE_DRIVER',
  },
  storageLocalPath: {
    doc: 'Directory for local-disk storage (dev only)',
    format: String,
    default: './uploads-local',
    env: 'STORAGE_LOCAL_PATH',
  },
  s3Bucket: {
    doc: 'S3 bucket for uploaded files (when storageDriver=s3)',
    format: String,
    default: '',
    env: 'S3_BUCKET',
  },
  s3Region: {
    doc: 'AWS region for the S3 bucket',
    format: String,
    default: 'eu-west-1',
    env: 'S3_REGION',
  },
  maxUploadSizeMb: {
    doc: 'Max accepted CSV file size in megabytes',
    format: Number,
    default: 20,
    env: 'MAX_UPLOAD_SIZE_MB',
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

// ✅ Best Practice: crash immediately on invalid config, before anything else boots.
schema.validate({ allowed: 'strict' });

export const config = schema.getProperties();
export type AppConfig = typeof config;
