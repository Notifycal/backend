import { describe, expect, it } from 'vitest';
import { toBase64 } from './crypto';

describe(toBase64, () => {
  it('converts an empty object to base64', () => {
    const input = {};
    const result = toBase64(input);

    expect(result).toBe('e30=');
  });

  it('converts a simple object to base64', () => {
    const input = { name: 'John', age: 30 };
    const result = toBase64(input);

    expect(result).toBe('eyJuYW1lIjoiSm9obiIsImFnZSI6MzB9');
  });

  it('converts an object with nested properties to base64', () => {
    const input = {
      user: {
        name: 'John',
        details: {
          age: 30,
          address: {
            city: 'New York',
            country: 'USA'
          }
        }
      }
    };
    const result = toBase64(input);

    expect(result).toBe(
      'eyJ1c2VyIjp7Im5hbWUiOiJKb2huIiwiZGV0YWlscyI6eyJhZ2UiOjMwLCJhZGRyZXNzIjp7ImNpdHkiOiJOZXcgWW9yayIsImNvdW50cnkiOiJVU0EifX19fQ=='
    );
  });

  it('converts an object with arrays to base64', () => {
    const input = {
      names: ['John', 'Jane', 'Bob'],
      scores: [95, 87, 92]
    };
    const result = toBase64(input);

    expect(result).toBe('eyJuYW1lcyI6WyJKb2huIiwiSmFuZSIsIkJvYiJdLCJzY29yZXMiOls5NSw4Nyw5Ml19');
  });

  it('converts an email event object to base64', () => {
    const input = {
      recipient: 'test@example.com',
      subject: 'Test Email',
      body: 'This is a test email',
      timestamp: 1649875200000
    };
    const result = toBase64(input);

    expect(result).toBe(
      'eyJyZWNpcGllbnQiOiJ0ZXN0QGV4YW1wbGUuY29tIiwic3ViamVjdCI6IlRlc3QgRW1haWwiLCJib2R5IjoiVGhpcyBpcyBhIHRlc3QgZW1haWwiLCJ0aW1lc3RhbXAiOjE2NDk4NzUyMDAwMDB9'
    );
  });

  it('confirms round-trip encoding and decoding works', () => {
    const input = { id: 12345, name: 'Test Object' };
    const base64Result = toBase64(input);
    const decodedJson = Buffer.from(base64Result, 'base64').toString();
    const decodedObject = JSON.parse(decodedJson) as object;

    expect(decodedObject).toStrictEqual(input);
  });
});
