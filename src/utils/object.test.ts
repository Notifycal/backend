import { describe, expect, it } from 'vitest';
import { omitDeep } from './object';

describe(omitDeep, () => {
  interface TestObject {
    name: string;
    age: number;
    address: {
      street: string;
      city: string;
      country: {
        name: string;
        code: string;
      };
    };
    hobbies: Array<string>;
    metadata: {
      created: string;
      updated: string;
      tags: {
        primary: string;
        secondary: string;
      };
    };
  }

  const validTestObject: TestObject = {
    name: 'John',
    age: 30,
    address: {
      street: '123 Main St',
      city: 'New York',
      country: {
        name: 'USA',
        code: 'US'
      }
    },
    hobbies: ['reading', 'coding'],
    metadata: {
      created: '2023-01-01',
      updated: '2023-01-02',
      tags: {
        primary: 'work',
        secondary: 'personal'
      }
    }
  };

  it('should omit top-level properties', () => {
    const result = omitDeep(validTestObject, 'name', 'age');

    expect(result).not.toHaveProperty('name');
    expect(result).not.toHaveProperty('age');
    expect(result).toHaveProperty('address');
    expect(result).toHaveProperty('hobbies');
  });

  it('should omit nested properties', () => {
    const result = omitDeep(validTestObject, 'address.street', 'address.country.code');

    expect(result.address).not.toHaveProperty('street');
    expect(result.address.country).not.toHaveProperty('code');
    expect(result.address).toHaveProperty('city');
    expect(result.address.country).toHaveProperty('name');
  });

  it('should omit deeply nested properties', () => {
    const result = omitDeep(validTestObject, 'metadata.tags.primary');

    expect(result.metadata.tags).not.toHaveProperty('primary');
    expect(result.metadata.tags).toHaveProperty('secondary');
    expect(result.metadata).toHaveProperty('created');
  });

  it('should handle multiple nested paths', () => {
    const result = omitDeep(validTestObject, 'name', 'address.street', 'metadata.tags.secondary');

    expect(result).not.toHaveProperty('name');
    expect(result.address).not.toHaveProperty('street');
    expect(result.metadata.tags).not.toHaveProperty('secondary');
    expect(result.metadata.tags).toHaveProperty('primary');
  });

  it('should handle non-existent paths gracefully', () => {
    const result = omitDeep(validTestObject, 'nonExistent', 'address.nonExistent');

    expect(result).toStrictEqual(validTestObject);
  });

  it('should not mutate the original object', () => {
    const original = { ...validTestObject };
    omitDeep(validTestObject, 'name');

    expect(validTestObject).toStrictEqual(original);
  });

  it('should provide type safety for nested keys', () => {
    const result1 = omitDeep(validTestObject, 'name');
    const result2 = omitDeep(validTestObject, 'address.street');
    const result3 = omitDeep(validTestObject, 'address.country.name');
    const result4 = omitDeep(validTestObject, 'metadata.tags.primary');

    expect(result1).not.toHaveProperty('name');
    expect(result2.address).not.toHaveProperty('street');
    expect(result3.address.country).not.toHaveProperty('name');
    expect(result4.metadata.tags).not.toHaveProperty('primary');
  });
});
