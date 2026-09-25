const os = require('node:os');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.MONGODB_URL = 'mongodb://127.0.0.1:27018/naija_bi_component_test';
process.env.REDIS_URL = 'redis://127.0.0.1:6380';
process.env.JWT_SECRET = 'component-test-secret';
process.env.CORS_ORIGIN = 'http://127.0.0.1';
process.env.STORAGE_DRIVER = 'local';
process.env.STORAGE_LOCAL_PATH = path.join(os.tmpdir(), 'naija-bi-component-uploads');
process.env.WORKER_CONCURRENCY = '1';
process.env.BCRYPT_SALT_ROUNDS = '4';
