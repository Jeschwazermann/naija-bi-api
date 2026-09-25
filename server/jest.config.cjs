module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/component/**/*.test.cjs'],
  setupFiles: ['<rootDir>/test/setup-env.cjs'],
  globalSetup: '<rootDir>/test/global-setup.cjs',
  globalTeardown: '<rootDir>/test/global-teardown.cjs',
  testTimeout: 30000,
  maxWorkers: 1,
};
