import { createDefaultEsmPreset } from 'ts-jest';
import type { JestConfigWithTsJest } from 'ts-jest';

const jestConfig: JestConfigWithTsJest = {
  ...createDefaultEsmPreset(),
  testEnvironment: 'node',
  verbose: true,
  modulePaths: ['<rootDir>'], // <-- This will be set to 'baseUrl' value
  moduleNameMapper: {
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@clients/(.*)$': '<rootDir>/src/clients/$1',
    '^@model/(.*)$': '<rootDir>/src/model/$1',
    '^@testing/(.*)$': '<rootDir>/src/testing/$1',
    '^@lambdas/(.*)$': '<rootDir>/src/lambdas/$1'
  },
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: ['jest-plugin-must-assert', '<rootDir>/src/testing/setup-tests.ts']
};

export default jestConfig;
