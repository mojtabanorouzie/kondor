/**
 * Jest config for Kondor.
 *
 * Phase 1 covers the data layer: pure TypeScript repository tests that run in
 * Node against an in-memory better-sqlite3 database (real SQL, no native Expo
 * module). React Native component tests will be added with a jest-expo project
 * in a later phase.
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  // Only *.test.ts are suites; helpers/ and fixtures are plain modules.
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
};
