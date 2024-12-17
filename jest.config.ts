import { createDefaultPreset, pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from './tsconfig.json';
import type { JestConfigWithTsJest } from 'ts-jest';

const jestConfig: JestConfigWithTsJest = {
  ...createDefaultPreset(),
  testEnvironment: 'node',
  verbose: true,
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
  setupFilesAfterEnv: ['jest-plugin-must-assert']
};

export default jestConfig;
