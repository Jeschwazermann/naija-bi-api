const net = require('node:net');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const composeFile = path.join(__dirname, '..', 'docker-compose.test.yml');
const composeProject = 'naija-bi-component-tests';
const services = [
  { name: 'MongoDB', service: 'mongo', port: 27018 },
  { name: 'Redis', service: 'redis', port: 6380 },
];

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForServices() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const available = await Promise.all(services.map(({ port }) => canConnect(port)));
    if (available.every(Boolean)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Timed out waiting for the component test MongoDB and Redis services.');
}

module.exports = async () => {
  const available = await Promise.all(services.map(({ port }) => canConnect(port)));
  if (available.every(Boolean)) {
    global.__naijaBiTestInfraStarted = false;
    return;
  }
  const missingServices = services
    .filter((_, index) => !available[index])
    .map(({ service }) => service);

  const result = spawnSync(
    'docker',
    ['compose', '-p', composeProject, '-f', composeFile, 'up', '-d', '--wait', ...missingServices],
    { cwd: path.join(__dirname, '..'), stdio: 'inherit' }
  );
  if (result.status !== 0) {
    throw new Error('Could not start component test services. Ensure Docker is running and retry.');
  }
  global.__naijaBiTestInfraStarted = true;
  await waitForServices();
};
