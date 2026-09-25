const axios = require('axios');

function createHttpClient(server) {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP server address.');
  return axios.create({
    baseURL: `http://127.0.0.1:${address.port}`,
    validateStatus: () => true,
  });
}

async function registerBusiness(authClient, suffix = `${Date.now()}-${Math.random()}`) {
  const response = await authClient.post('/auth/register', {
    businessName: 'Component Test Shop',
    email: `shop-${suffix}@example.test`,
    password: 'Test-password-123!',
  });
  return { response, credentials: response.data };
}

function withToken(client, token) {
  return client.create({ headers: { authorization: `Bearer ${token}` }, validateStatus: () => true });
}

module.exports = { createHttpClient, registerBusiness, withToken };
