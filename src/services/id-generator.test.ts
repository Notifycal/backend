import { describe, it, expect } from 'vitest';
import { validate as validateUuid } from 'uuid';
import { idGenerator } from './id-generator';
import type { IdpName } from '@model/Identity';

describe('Id generator', () => {
  const idpName = 'google.com';

  it('should generate a valid UUID v4 for a given input string', () => {
    const input = 'test-input';
    const generatedId = idGenerator(input, idpName);

    expect(validateUuid(generatedId)).toBeTruthy();
  });

  it('should generate the same UUID for the same input string', () => {
    const input = 'consistent-input';
    const id1 = idGenerator(input, idpName);
    const id2 = idGenerator(input, idpName);

    expect(id1).toStrictEqual(id2);
  });

  it('should generate different UUIDs for different input strings', () => {
    const input1 = 'input-one';
    const input2 = 'input-two';
    const id1 = idGenerator(input1, idpName);
    const id2 = idGenerator(input2, idpName);

    expect(id1).not.toStrictEqual(id2);
  });

  it('should generate different UUIDs for ids from different IdPs', () => {
    const input1 = 'input-one';
    const input2 = 'input-two';
    const id1 = idGenerator(input1, idpName);
    const id2 = idGenerator(input2, 'ADifferentIdP' as IdpName);

    expect(id1).not.toStrictEqual(id2);
  });

  it('should handle an empty string as input', () => {
    const input = '';
    const generatedId = idGenerator(input, idpName);

    expect(validateUuid(generatedId)).toBeTruthy();
  });

  it('should handle large input strings', () => {
    const input = 'a'.repeat(10_000);
    const generatedId = idGenerator(input, idpName);

    expect(validateUuid(generatedId)).toBeTruthy();
  });

  it('should not produce collisions for a large number of unique inputs', () => {
    const uniqueInputs = Array.from({ length: 100000 }, (_, i) => `input-${i}`);
    const generatedIds = uniqueInputs.map((input) => idGenerator(input, idpName));
    const uniqueIdsSet = new Set(generatedIds);

    expect(uniqueIdsSet.size).toStrictEqual(generatedIds.length);
  });
});
