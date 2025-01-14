import { expect, jest } from '@jest/globals';
import { toRejectWithErrorContainingMessageParts } from './utils/matchers';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const OLD_ENV = JSON.parse(JSON.stringify(process.env));

export function resetTestingContext(): void {
  vi.clearAllMocks();
  vi.resetModules();
  process.env = OLD_ENV;
}

global.beforeAll(resetTestingContext);
global.beforeEach(resetTestingContext);
global.afterAll(resetTestingContext);

expect.extend({
  toRejectWithErrorContainingMessageParts: toRejectWithErrorContainingMessageParts
});
