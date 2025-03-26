import { type Version4Options, v4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import { softwareUnderTest } from './uuid-mock';

describe('testing uuid - mocked', () => {
  it('ok', () => {
    vi.mock('uuid');

    const input = 'b93608cf-d3f6-4feb-b426-522377f09eb4';

    vi.mocked<(options?: Version4Options, buf?: undefined, offset?: number) => string>(
      v4
    ).mockReturnValue(input);

    const result = softwareUnderTest();

    expect(result).toBe(`${input} hello`);
  });
});
