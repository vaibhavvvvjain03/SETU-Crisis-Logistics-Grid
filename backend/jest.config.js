module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['@swc/jest'],
    '^.+\\.mjs$': ['@swc/jest'],
    '^.+\\.js$': ['@swc/jest'],
  },
  // Transform ESM packages (uuid, zod) that Jest's require() cannot handle as-is
  transformIgnorePatterns: [
    'node_modules[\\\\/](?!(uuid|zod)[\\\\/])',
  ],
  setupFilesAfterEnv: ['aws-cdk-lib/testhelpers/jest-autoclean'],
};
