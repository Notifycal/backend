/* eslint-disable vitest/max-expects */
import { describe, expect, it } from 'vitest';
import { mergeErrors, mergeTypedErrors, normalizeToError } from './errors';

describe('normalizeToError', () => {
  it('should return the same object if it is already an Error', () => {
    const originalError = new Error('Original error');
    originalError.name = 'OriginalError';

    const result = normalizeToError(originalError);

    expect(result).toBe(originalError);
    expect(result.name).toBe('OriginalError');
    expect(result.message).toBe('Original error');
  });

  it('should convert an error-like object to Error', () => {
    const errorLike = {
      name: 'CustomError',
      message: 'Custom message',
      stack: 'Custom stack trace'
    };

    const result = normalizeToError(errorLike);

    expect(result).toBeInstanceOf(Error);
    expect(result.name).toBe('CustomError');
    expect(result.message).toBe('Custom message');
    expect(result.stack).toBe('Custom stack trace');
  });

  it('should handle objects with cause property', () => {
    const innerCause = new Error('Cause error');
    const errorWithCause = {
      message: 'Main error',
      cause: innerCause
    };

    const result = normalizeToError(errorWithCause);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Main error');
    expect(result.cause).toBe(innerCause);
  });

  it('should convert plain objects to Error with stringified JSON', () => {
    const object = { foo: 'bar', num: 123 };

    const result = normalizeToError(object);

    expect(result).toBeInstanceOf(Error);
    expect(result.name).toBe('NormalizedError');
    expect(result.message).toBe('Error: {"foo":"bar","num":123}');
  });

  it('should handle primitive values', () => {
    expect(normalizeToError('test string').message).toBe('string: test string');
    expect(normalizeToError(42).message).toBe('number: 42');
    expect(normalizeToError(true).message).toBe('boolean: true');
    expect(normalizeToError(null).message).toBe('object: null');
    expect(normalizeToError(undefined).message).toBe('undefined: undefined');
  });

  it('should handle unserializable objects', () => {
    interface CircularObject {
      [key: string]: unknown;
    }
    const circular: CircularObject = {};
    circular.self = circular;

    const result = normalizeToError(circular);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toContain('Unserializable object: object');
  });
});

describe('mergeTypedErrors', () => {
  it('should merge multiple errors with default message', () => {
    const error1 = new Error('Error 1');
    const error2 = new Error('Error 2');

    const result = mergeTypedErrors([error1, error2]);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Everything went wrong');
    expect(result.cause).toHaveProperty('error0');
    expect(result.cause).toHaveProperty('error1');
    expect(result.cause.error0.message).toBe('Error 1');
    expect(result.cause.error1.message).toBe('Error 2');
  });

  it('should merge errors with custom message', () => {
    const error1 = new Error('First error');
    const error2 = new Error('Second error');

    const result = mergeTypedErrors([error1, error2], 'Custom merged message');

    expect(result.message).toBe('Custom merged message');
  });

  it('should preserve error properties in the cause', () => {
    const error1 = new Error('Error with props');
    error1.name = 'SpecialError';

    const error2 = new Error('Another error');
    error2.name = 'AnotherError';

    const result = mergeTypedErrors([error1, error2]);

    expect(result.cause.error0.name).toBe('SpecialError');
    expect(result.cause.error1.name).toBe('AnotherError');
  });

  it('should handle empty array', () => {
    const result = mergeTypedErrors([]);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Everything went wrong');
    expect(result.cause).toStrictEqual({});
  });
});

describe('mergeErrors', () => {
  it('should normalize and merge various error types', () => {
    const mixedErrors = [
      new Error('Standard error'),
      { name: 'CustomError', message: 'Custom error object' },
      'Just a string',
      { prop: 'value' },
      42
    ];

    const result = mergeErrors(mixedErrors, 'Multiple errors occurred');

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Multiple errors occurred');
    expect(result.cause).toHaveProperty('error0');
    expect(result.cause).toHaveProperty('error1');
    expect(result.cause).toHaveProperty('error2');
    expect(result.cause).toHaveProperty('error3');
    expect(result.cause).toHaveProperty('error4');

    expect(result.cause.error0.message).toBe('Standard error');
    expect(result.cause.error1.message).toBe('Custom error object');
    expect(result.cause.error2.message).toBe('string: Just a string');
    expect(result.cause.error3.message).toBe('Error: {"prop":"value"}');
    expect(result.cause.error4.message).toBe('number: 42');
  });

  it('should handle empty array', () => {
    const result = mergeErrors([]);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Everything went wrong');
    expect(result.cause).toStrictEqual({});
  });
});
