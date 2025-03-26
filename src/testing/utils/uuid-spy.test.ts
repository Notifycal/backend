import * as uuid from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { softwareUnderTest } from './uuid-mock';

describe('testing uuid - spyOn', () => {
  it('ok', () => {
    vi.mock('uuid');

    const input = 'b93608cf-d3f6-4feb-b426-522377f09eb4';
    vi.spyOn(uuid, 'v4').mockReturnValue(input as unknown as Uint8Array);

    const result = softwareUnderTest();

    expect(result).toBe(`${input} hello`);
  });
});
