const { spawnSync } = require('node:child_process');
const path = require('node:path');

module.exports = async () => {
  if (process.env.CI !== 'true' || !global.__naijaBiTestInfraStarted) return;
  const result = spawnSync(
    'docker',
    [
      'compose',
      '-p',
      'naija-bi-component-tests',
      '-f',
      path.join(__dirname, '..', 'docker-compose.test.yml'),
      'down',
      '--volumes',
      '--remove-orphans',
    ],
    { cwd: path.join(__dirname, '..'), stdio: 'inherit' }
  );
  if (result.status !== 0) throw new Error('Could not tear down CI component test services.');
};
