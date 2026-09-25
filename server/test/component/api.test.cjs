const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const axios = require('axios');
const nock = require('nock');
const sinon = require('sinon');
const {
  getUploadsCollection,
  getSalesRawCollection,
  getSalesAggregatesCollection,
  getBusinessesCollection,
  getRefreshTokensCollection,
} = require('../../libraries/mongo-client/.dist');
const { createProcessUploadQueue, closeRedisConnection } = require('../../libraries/queue-client/.dist');
const authApi = require('../../services/auth-api/.dist/entry-points/api/server');
const uploadApi = require('../../services/upload-api/.dist/entry-points/api/server');
const analyticsApi = require('../../services/analytics-api/.dist/entry-points/api/server');
const workerApi = require('../../services/worker/.dist/entry-points/worker');
const { createHttpClient, registerBusiness, withToken } = require('../test-helpers.cjs');

const storagePath = path.join(os.tmpdir(), 'naija-bi-component-uploads');
const csv = [
  'date,product,category,quantity,amount',
  '10/03/2026,Plantain,Food,2,150.50',
  '10/03/2026,Orange,Food,1,300.00',
].join('\n');

let authServer;
let uploadServer;
let analyticsServer;
let worker;
let workerHealthServer;
let auth;
let uploads;
let analytics;

async function registerAndCreateClients() {
  const { response, credentials } = await registerBusiness(auth);
  expect(response.status).toBe(201);
  return {
    credentials,
    uploadClient: withToken(uploads, credentials.accessToken),
    analyticsClient: withToken(analytics, credentials.accessToken),
  };
}

async function uploadCsv(client, contents = csv) {
  const form = new FormData();
  form.append('file', new Blob([contents], { type: 'text/csv' }), 'sales.csv');
  return client.post('/uploads', form);
}

async function waitForUpload(client, uploadId) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const response = await client.get(`/uploads/${uploadId}`);
    if (['completed', 'failed', 'failed_partial'].includes(response.data.status)) return response;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Upload ${uploadId} did not finish within 15 seconds.`);
}

beforeAll(async () => {
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1');

  const queue = createProcessUploadQueue(process.env.REDIS_URL);
  await queue.waitUntilReady();
  await queue.obliterate({ force: true });
  await queue.close();
  await closeRedisConnection();

  authServer = await authApi.startWebServer();
  uploadServer = await uploadApi.startWebServer();
  analyticsServer = await analyticsApi.startWebServer();
  worker = await workerApi.startWorker();
  workerHealthServer = await workerApi.startHealthServer();

  auth = createHttpClient(authServer);
  uploads = createHttpClient(uploadServer);
  analytics = createHttpClient(analyticsServer);
});

beforeEach(async () => {
  nock.cleanAll();
  sinon.restore();
  const queue = createProcessUploadQueue(process.env.REDIS_URL);
  await queue.waitUntilReady();
  await queue.clean(0, 1000, 'completed');
  await queue.clean(0, 1000, 'failed');
  await queue.close();
  await Promise.all([
    getUploadsCollection().deleteMany({}),
    getSalesRawCollection().deleteMany({}),
    getSalesAggregatesCollection().deleteMany({}),
    getBusinessesCollection().deleteMany({}),
    getRefreshTokensCollection().deleteMany({}),
  ]);
  await fs.rm(storagePath, { recursive: true, force: true });
});

afterAll(async () => {
  nock.enableNetConnect();
  if (workerHealthServer) {
    await new Promise((resolve, reject) =>
      workerHealthServer.close((error) => (error ? reject(error) : resolve()))
    );
  }
  await worker?.close();
  if (uploadServer) await uploadApi.stopWebServer(uploadServer);
  if (analyticsServer) await analyticsApi.stopWebServer(analyticsServer);
  if (authServer) await authApi.stopWebServer(authServer);
  sinon.restore();
});

describe('/auth', () => {
  describe('POST /auth/register', () => {
    test('When valid business details are provided, Then it persists the business and returns real tokens', async () => {
      const { response, credentials } = await registerBusiness(auth);

      expect(response.status).toBe(201);
      expect(credentials.accessToken).toEqual(expect.any(String));
      expect(credentials.refreshToken).toEqual(expect.any(String));
      expect(await getBusinessesCollection().countDocuments({})).toBe(1);
    });

    test('When required fields are missing, Then it returns 400', async () => {
      const response = await auth.post('/auth/register', { email: 'missing@example.test' });
      expect(response.status).toBe(400);
    });

    test('When an email is already registered, Then it returns 409', async () => {
      const first = await registerBusiness(auth, 'duplicate');
      const second = await auth.post('/auth/register', {
        businessName: 'Another Shop',
        email: 'shop-duplicate@example.test',
        password: 'Test-password-123!',
      });
      expect(first.response.status).toBe(201);
      expect(second.status).toBe(409);
    });
  });

  describe('POST /auth/login', () => {
    test('When valid credentials are provided, Then it returns a usable access token', async () => {
      await registerBusiness(auth, 'login');
      const response = await auth.post('/auth/login', {
        email: 'shop-login@example.test',
        password: 'Test-password-123!',
      });
      expect(response.status).toBe(200);
      expect(response.data.accessToken).toEqual(expect.any(String));

      const protectedResponse = await withToken(analytics, response.data.accessToken).get('/analytics/summary');
      expect(protectedResponse.status).toBe(200);
    });

    test('When the password is incorrect, Then it returns 401', async () => {
      await registerBusiness(auth, 'bad-password');
      const response = await auth.post('/auth/login', {
        email: 'shop-bad-password@example.test',
        password: 'wrong-password',
      });
      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/refresh and POST /auth/logout', () => {
    test('When a refresh token is rotated and then logged out, Then the old token cannot be reused', async () => {
      const { credentials } = await registerBusiness(auth, 'refresh');
      const refreshed = await auth.post('/auth/refresh', { refreshToken: credentials.refreshToken });
      expect(refreshed.status).toBe(200);
      expect(refreshed.data.refreshToken).not.toBe(credentials.refreshToken);

      const oldToken = await auth.post('/auth/refresh', { refreshToken: credentials.refreshToken });
      expect(oldToken.status).toBe(401);
      const logout = await auth.post('/auth/logout', { refreshToken: refreshed.data.refreshToken });
      expect(logout.status).toBe(204);
      const revoked = await auth.post('/auth/refresh', { refreshToken: refreshed.data.refreshToken });
      expect(revoked.status).toBe(401);
    });
  });
});

describe('/uploads', () => {
  describe('POST /uploads', () => {
    test('When the request has no valid JWT, Then it returns 401', async () => {
      const response = await uploadCsv(uploads);
      expect(response.status).toBe(401);
    });

    test('When an authenticated request has no file, Then it returns 400', async () => {
      const { credentials } = await registerBusiness(auth, 'missing-file');
      const response = await withToken(uploads, credentials.accessToken).post('/uploads', {});
      expect(response.status).toBe(400);
    });

    test('When a valid CSV is uploaded, Then the worker persists it and analytics returns the aggregates', async () => {
      const { credentials, uploadClient, analyticsClient } = await registerAndCreateClients();
      const accepted = await uploadCsv(uploadClient);
      expect(accepted.status).toBe(202);
      expect(accepted.data.status).toBe('queued');

      const completed = await waitForUpload(uploadClient, accepted.data.uploadId);
      expect(completed.status).toBe(200);
      expect(completed.data.status).toBe('completed');
      expect(completed.data.rowsProcessed).toBe(2);
      expect(completed.data.rowsRejected).toBe(0);
      expect(await getSalesRawCollection().countDocuments({ businessId: credentials.businessId })).toBe(2);

      const summary = await analyticsClient.get('/analytics/summary', {
        params: { from: '2026-03-01', to: '2026-03-31' },
      });
      expect(summary.status).toBe(200);
      expect(summary.data).toEqual({
        totalAmountNaira: 450.5,
        totalQuantity: 3,
        orderCount: 2,
        daysWithSales: 1,
      });

      const topProducts = await analyticsClient.get('/analytics/top-products', {
        params: { from: '2026-03-01', to: '2026-03-31' },
      });
      expect(topProducts.status).toBe(200);
      expect(topProducts.data[0]).toEqual({ product: 'Orange', amountNaira: 300, quantity: 1 });
    });

    test('When a CSV has one invalid row, Then it reports partial failure and keeps accepted rows', async () => {
      const { uploadClient } = await registerAndCreateClients();
      const partialCsv = `${csv}\nnot-a-date,Mango,Food,1,10.00`;
      const accepted = await uploadCsv(uploadClient, partialCsv);
      expect(accepted.status).toBe(202);
      const completed = await waitForUpload(uploadClient, accepted.data.uploadId);
      expect(completed.data.status).toBe('failed_partial');
      expect(completed.data.rowsProcessed).toBe(2);
      expect(completed.data.rowsRejected).toBe(1);
    });
  });

  describe('GET /uploads/:id', () => {
    test('When an authenticated business requests an unknown upload, Then it returns 404', async () => {
      const { credentials } = await registerBusiness(auth, 'unknown-upload');
      const response = await withToken(uploads, credentials.accessToken).get('/uploads/unknown-id');
      expect(response.status).toBe(404);
    });
  });
});

describe('/analytics', () => {
  describe('GET /analytics/summary', () => {
    test('When the request is unauthenticated, Then it returns 401', async () => {
      const response = await analytics.get('/analytics/summary');
      expect(response.status).toBe(401);
    });

    test('When the date range is invalid, Then it returns 400', async () => {
      const { analyticsClient } = await registerAndCreateClients();
      const response = await analyticsClient.get('/analytics/summary', { params: { from: 'bad-date' } });
      expect(response.status).toBe(400);
    });
  });

  describe('GET /health', () => {
    test('When MongoDB and Redis are connected, Then each service returns 200', async () => {
      const authHealth = await axios.get(`${auth.defaults.baseURL}/health`);
      const uploadHealth = await axios.get(`${uploads.defaults.baseURL}/health`);
      const analyticsHealth = await axios.get(`${analytics.defaults.baseURL}/health`);
      const workerAddress = workerHealthServer.address();
      const workerHealth = await axios.get(`http://127.0.0.1:${workerAddress.port}/health`);

      expect([authHealth.status, uploadHealth.status, analyticsHealth.status, workerHealth.status]).toEqual([
        200, 200, 200, 200,
      ]);
    });
  });
});
