import type { DateTime, TimeZone } from '@notifycal/shared/types';
import { DateTime as DT } from 'luxon';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { timezoneValidator } from './datetime';

export const dateTimeSchema = z
  .string()
  .datetime()
  .transform((data) => data as DateTime)
  .transform((v) => DT.fromISO(v).toUTC());

describe('Working with datetimes', () => {
  it('handle UTC properly', () => {
    const input = '2024-01-01T15:00:00.000Z';
    const result = DT.fromISO(input).toUTC();

    expect(result.toISO()).toStrictEqual(input);
  });

  it('handle timezones properly for display', () => {
    const input = '2025-03-29T00:00:00.000Z';

    const result = DT.fromISO(input, { zone: 'Europe/Madrid' });
    const expectedResultForMadrileanGuy = '2025-03-29T01:00:00.000+01:00';

    expect(result.toISO()).toStrictEqual(expectedResultForMadrileanGuy);
  });

  it('handle timezones properly for display - summertime', () => {
    const input = '2025-03-30T10:00:00.000Z';

    const result = DT.fromISO(input, { zone: 'Europe/Madrid' });
    const expectedResultForMadrileanGuy = '2025-03-30T12:00:00.000+02:00';

    expect(result.toISO()).toStrictEqual(expectedResultForMadrileanGuy);
  });

  it('should take into account time zone when parsing', () => {
    const input = '2024-01-01T15:00:00.000Z';
    const result = dateTimeSchema.safeParse(input);

    expect(result.success).toBe(true);
    expect(result.data?.toISO()).toBe(input);
  });
});

describe(timezoneValidator, () => {
  it.each([
    'UTC',
    'GMT',
    'Europe/Madrid',
    'europe/madrid',
    'America/New_York',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Africa/Cairo',
    'Pacific/Auckland',
    'Etc/GMT+12',
    'America/Argentina/Buenos_Aires'
  ])('should validate correct timezone: %s', (timezone) => {
    const mockContext = {
      addIssue: vi.fn(),
      path: []
    };

    const validator = timezoneValidator();
    const result = validator(timezone as TimeZone, mockContext);

    expect(result).toBe(true);
    expect(mockContext.addIssue).not.toHaveBeenCalled();
  });

  it.each([
    '',
    ' ',
    'Invalid',
    'Europe',
    'Europe/Madrid/Extra',
    'Europe/ Madrid',
    'America/New York',
    '12345',
    'GMT+123',
    'UTC+'
  ])('should reject invalid timezone format: %s', (timezone) => {
    const mockContext = {
      addIssue: vi.fn(),
      path: []
    };

    const validator = timezoneValidator();
    const result = validator(timezone as TimeZone, mockContext);

    expect(result).toBe(false);
    expect(mockContext.addIssue).toHaveBeenCalledTimes(1);
    expect(mockContext.addIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        code: z.ZodIssueCode.custom,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message: expect.stringContaining('Invalid timezone')
      })
    );
  });

  it.each([
    [null, 'null'],
    [undefined, 'undefined']
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ])('should reject %s value', (timezone, _label) => {
    const mockContext = {
      addIssue: vi.fn(),
      path: []
    };

    const validator = timezoneValidator();
    const result = validator(timezone as unknown as TimeZone, mockContext);

    expect(result).toBe(false);
    expect(mockContext.addIssue).toHaveBeenCalledTimes(1);
  });

  it('integration with Zod schema', () => {
    const TimezoneSchema = z
      .string()
      .transform((data) => data as TimeZone)
      .superRefine(timezoneValidator());

    const validResult = TimezoneSchema.safeParse('America/Chicago');

    expect(validResult.success).toBe(true);

    const invalidResult = TimezoneSchema.safeParse('Invalid/Zone');

    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error?.issues.length).toBeGreaterThan(0);
  });

  it('should validate Etc/GMT+0', () => {
    const mockContext = {
      addIssue: vi.fn(),
      path: []
    };

    const validator = timezoneValidator();
    const result = validator('Etc/GMT+0' as TimeZone, mockContext);

    expect(result).toBe(true);
    expect(mockContext.addIssue).not.toHaveBeenCalled();
  });
});
