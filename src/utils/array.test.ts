import { describe, expect, it } from 'vitest';
import { capArray } from './array';

describe(capArray, () => {
  it('returns the original array when not exceeding the limit', () => {
    const input = [1, 2, 3, 4, 5];
    const limit = 10;

    const result = capArray(input, limit);

    expect(result.items).toStrictEqual(input);
    expect(result.dropped).toStrictEqual([]);
    expect(result.items).toHaveLength(5);
    expect(result.dropped).toHaveLength(0);
  });

  it('truncates the array when exceeding the limit', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const limit = 5;

    const result = capArray(input, limit);

    expect(result.items).toStrictEqual([1, 2, 3, 4, 5]);
    expect(result.dropped).toStrictEqual([6, 7, 8]);
    expect(result.items).toHaveLength(5);
    expect(result.dropped).toHaveLength(3);
  });

  it('handles empty arrays correctly', () => {
    const input: Array<number> = [];
    const limit = 5;

    const result = capArray(input, limit);

    expect(result.items).toStrictEqual([]);
    expect(result.dropped).toStrictEqual([]);
  });

  it('handles zero limit correctly', () => {
    const input = [1, 2, 3, 4, 5];
    const limit = 0;

    const result = capArray(input, limit);

    expect(result.items).toStrictEqual([]);
    expect(result.dropped).toStrictEqual([1, 2, 3, 4, 5]);
  });

  it('handles negative limit as if it was zero', () => {
    const input = [1, 2, 3, 4, 5];
    const limit = -3;

    const result = capArray(input, limit);

    expect(result.items).toStrictEqual([]);
    expect(result.dropped).toStrictEqual([1, 2, 3, 4, 5]);
  });

  it('works with different data types', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    const limit = 3;

    const result = capArray(input, limit);

    expect(result.items).toStrictEqual(['a', 'b', 'c']);
    expect(result.dropped).toStrictEqual(['d', 'e']);
  });
});
