import type { IdpName } from '@notifycal/shared/types';
import { validate as validateUuid } from 'uuid';
import { describe, expect, it } from 'vitest';
import { hashString, idGenerator } from './id-generator';

describe('Id generator', () => {
  const idpName = 'google.com';

  it('should generate a valid v5 UUID for a given input string and an Idp', () => {
    const input = 'test-input';
    const generatedId = idGenerator(input, idpName);

    expect(validateUuid(generatedId)).toBe(true);
  });

  it('should generate the same UUID for the same input string and Idp', () => {
    const input = 'consistent-input';
    const id1 = idGenerator(input, idpName);
    const id2 = idGenerator(input, idpName);

    expect(id1).toStrictEqual(id2);
  });

  it('should generate different UUIDs for different input strings and same IdP', () => {
    const input1 = 'input-one';
    const input2 = 'input-two';
    const id1 = idGenerator(input1, idpName);
    const id2 = idGenerator(input2, idpName);

    expect(id1).not.toStrictEqual(id2);
  });

  it('should generate different UUIDs for equal input strings and a different IdP', () => {
    const input = 'consistent-input';
    const id1 = idGenerator(input, idpName);
    const id2 = idGenerator(input, 'ADifferentIdP' as IdpName);

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

    expect(validateUuid(generatedId)).toBe(true);
  });

  it('should handle large input strings', () => {
    const input = 'a'.repeat(10_000);
    const generatedId = idGenerator(input, idpName);

    expect(validateUuid(generatedId)).toBe(true);
  });

  it('should not produce collisions for a large number of unique inputs', () => {
    const uniqueInputs = Array.from({ length: 100000 }, (_, i) => `input-${i}`);
    const generatedIds = uniqueInputs.map((input) => idGenerator(input, idpName));
    const uniqueIdsSet = new Set(generatedIds);

    expect(uniqueIdsSet.size).toStrictEqual(generatedIds.length);
  });
});

describe('Hash string', () => {
  it('should generate a valid UUID v4 for a given input string', () => {
    const input = 'test-input';
    const generatedId = hashString(input);

    expect(validateUuid(generatedId)).toBe(true);
  });

  it('should generate the same UUID for the same input string', () => {
    const input = 'consistent-input';
    const id1 = hashString(input);
    const id2 = hashString(input);

    expect(id1).toStrictEqual(id2);
  });

  it('should generate different UUIDs for different input strings', () => {
    const input1 = 'input-one';
    const input2 = 'input-two';
    const id1 = hashString(input1);
    const id2 = hashString(input2);

    expect(id1).not.toStrictEqual(id2);
  });

  it('should handle an empty string as input', () => {
    const input = '';
    const generatedId = hashString(input);

    expect(validateUuid(generatedId)).toBe(true);
  });

  it('should handle large input strings', () => {
    const input = 'a'.repeat(10_000);
    const generatedId = hashString(input);

    expect(validateUuid(generatedId)).toBe(true);
  });

  it('should not produce collisions for a large number of unique inputs', () => {
    const uniqueInputs = Array.from({ length: 100000 }, (_, i) => `input-${i}`);
    const generatedIds = uniqueInputs.map((input) => hashString(input));
    const uniqueIdsSet = new Set(generatedIds);

    expect(uniqueIdsSet.size).toStrictEqual(generatedIds.length);
  });
});
