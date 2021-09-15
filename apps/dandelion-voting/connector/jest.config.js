const packageName = require('./package.json').name.split('@1hive/').pop()

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  testRegex: `(__tests__/.*|\\.(test|spec))\\.tsx?$`,
  name: packageName,
  displayName: 'DANDELION-VOTING',
  testTimeout: 30000,
}
