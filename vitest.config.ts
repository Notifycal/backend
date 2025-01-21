import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Docs: https://vitest.dev/config
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'node',
      setupFiles: ['src/testing/setup-tests.ts'],
      coverage: {
        enabled: false,
        include: ['src/*'],
        exclude: ['testing/*'],
        extension: ['.ts']
      },
      typecheck: {
        enabled: true,
        tsconfig: 'tsconfig.json'
      },
      clearMocks: true,
      mockReset: true,
      expect: {
        requireAssertions: true
      },
      retry: 0,
      bail: 0
    }
  })
);
