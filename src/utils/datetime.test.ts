import type { DateTime, Percentage, TimeZone, UnixTimestamp } from '@notifycal/shared/types';
import type { Period } from '@own-types/model';
import { DateTime as DT } from 'luxon';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { remainingPeriodPercentage, timezoneValidator } from './datetime';

export const dateTimeSchema = z.iso
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
      value: undefined,
      issues: [],
      addIssue: vi.fn()
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
      value: undefined,
      issues: [],
      addIssue: vi.fn()
    };

    const validator = timezoneValidator();
    const result = validator(timezone as TimeZone, mockContext);

    expect(result).toBe(false);
    expect(mockContext.addIssue).toHaveBeenCalledTimes(1);
    expect(mockContext.addIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'custom',
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
      value: undefined,
      issues: [],
      addIssue: vi.fn()
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
      .refine(timezoneValidator);

    const validResult = TimezoneSchema.safeParse('America/Chicago');

    expect(validResult.success).toBe(true);

    const invalidResult = TimezoneSchema.safeParse('Invalid/Zone');

    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error?.issues.length).toBeGreaterThan(0);
  });

  it('should validate Etc/GMT+0', () => {
    const mockContext = {
      value: undefined,
      issues: [],
      addIssue: vi.fn()
    };

    const validator = timezoneValidator();
    const result = validator('Etc/GMT+0' as TimeZone, mockContext);

    expect(result).toBe(true);
    expect(mockContext.addIssue).not.toHaveBeenCalled();
  });
});

describe(remainingPeriodPercentage, () => {
  const validPeriod: Period = {
    start: 1000 as UnixTimestamp,
    end: 2000 as UnixTimestamp
  };

  const validNowInMiddle = 1500 as UnixTimestamp;
  const validNowAtStart = 1000 as UnixTimestamp;
  const validNowAtEnd = 2000 as UnixTimestamp;
  const validNowBeforeStart = 500 as UnixTimestamp;
  const validNowAfterEnd = 2500 as UnixTimestamp;

  const validZeroDurationPeriod: Period = {
    start: 1000 as UnixTimestamp,
    end: 1000 as UnixTimestamp
  };

  it('should return 50 when now is at middle of period', () => {
    const result = testIt(validPeriod, validNowInMiddle);

    expect(result).toBe(50);
  });

  it('should return 100 when now is at start of period', () => {
    const result = testIt(validPeriod, validNowAtStart);

    expect(result).toBe(100);
  });

  it('should return 0 when now is at end of period', () => {
    const result = testIt(validPeriod, validNowAtEnd);

    expect(result).toBe(0);
  });

  it('should return 0 when now is after end of period', () => {
    const result = testIt(validPeriod, validNowAfterEnd);

    expect(result).toBe(0);
  });

  it('should return 0 when now is before start of period', () => {
    const result = testIt(validPeriod, validNowBeforeStart);

    expect(result).toBe(0);
  });

  it('should round result to 2 decimal places for percentage display', () => {
    const periodWith3Digits: Period = {
      start: 1000 as UnixTimestamp,
      end: 1003 as UnixTimestamp
    };
    const nowWith1Remaining = 1002 as UnixTimestamp;

    const result = testIt(periodWith3Digits, nowWith1Remaining);

    expect(result).toBe(33.33333);
  });

  it('should handle very small remaining percentages', () => {
    const largePeriod: Period = {
      start: 1751327815 as UnixTimestamp,
      end: 1753919755 as UnixTimestamp
    };
    const almostAtEnd = 1753919754 as UnixTimestamp;

    const result = testIt(largePeriod, almostAtEnd);

    expect(result).toBe(0.00003);
  });

  it('should handle very large remaining percentages', () => {
    const largePeriod: Period = {
      start: 1751327815 as UnixTimestamp,
      end: 1753919755 as UnixTimestamp
    };
    const almostAtTheBeginning = 1751327862 as UnixTimestamp;

    const result = testIt(largePeriod, almostAtTheBeginning);

    expect(result).toBe(99.99818);
  });

  it('should return 0 when period has zero duration', () => {
    const result = testIt(validZeroDurationPeriod, validNowInMiddle);

    expect(result).toBe(0);
  });

  it('should return 0 when period has zero duration and now equals period timestamps', () => {
    const nowAtZeroDurationPeriod = 1000 as UnixTimestamp;
    const result = testIt(validZeroDurationPeriod, nowAtZeroDurationPeriod);

    expect(result).toBe(0);
  });

  function testIt(period: Period, now: UnixTimestamp): Percentage {
    return remainingPeriodPercentage(period, now);
  }
});
