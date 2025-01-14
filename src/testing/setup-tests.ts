import { vi, beforeAll, beforeEach, afterAll, expect } from 'vitest';
import { toRejectWithErrorContainingMessageParts } from './utils/matchers';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const OLD_ENV = JSON.parse(JSON.stringify(process.env));

export function resetTestingContext(): void {
  vi.clearAllMocks();
  vi.resetModules();
  process.env = OLD_ENV;
}

beforeAll(resetTestingContext);
beforeEach(resetTestingContext);
afterAll(resetTestingContext);

expect.extend({
  toRejectWithErrorContainingMessageParts: toRejectWithErrorContainingMessageParts
});
