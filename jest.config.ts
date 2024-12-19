import { createDefaultPreset } from 'ts-jest';
import type { JestConfigWithTsJest } from 'ts-jest';

const esModules = ["@middy"].join("|")
const jestConfig: JestConfigWithTsJest = {
  ...createDefaultPreset(),
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
  transform: {
    "^.+\\.ts?$": [
      "ts-jest",
      {
        useESM: true
      }
    ]
  },
  transformIgnorePatterns: [`node_modules/(?!${esModules})`],
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: ['jest-plugin-must-assert']
};

export default jestConfig;
