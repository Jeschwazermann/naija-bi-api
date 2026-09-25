import convict from 'convict';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../../..', '.env'), quiet: true });

const schema = convict({
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
  concurrency: {
    doc: 'Number of jobs this worker processes concurrently',
    format: 'nat',
    default: 5,
    env: 'WORKER_CONCURRENCY',
  },
  healthPort: {
    doc: 'HTTP port for worker readiness and liveness checks',
    format: 'port',
    default: 8080,
    env: 'HEALTH_PORT',
  },
  storageDriver: {
    doc: 'Where uploaded CSV files are read from — must match upload-api',
    format: ['local', 's3'],
    default: 's3',
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
    default: 'eu-west-2',
    env: 'S3_REGION',
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
