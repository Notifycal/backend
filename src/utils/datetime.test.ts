import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

export const dateTimeSchema = z
  .string()
  .datetime()
  .brand('DateTime')
  .transform((v) => DateTime.fromISO(v).toUTC());

describe('Working with datetimes', () => {
  it('handle UTC properly', () => {
    const input = '2024-01-01T15:00:00.000Z';
    const result = DateTime.fromISO(input).toUTC();

    expect(result.toISO()).toStrictEqual(input);
  });

  it('handle timezones properly for display', () => {
    const input = '2025-03-29T00:00:00.000Z';

    const result = DateTime.fromISO(input, { zone: 'Europe/Madrid' });
    const expectedResultForMadrileanGuy = '2025-03-29T01:00:00.000+01:00';

    expect(result.toISO()).toStrictEqual(expectedResultForMadrileanGuy);
  });

  it('handle timezones properly for display - summertime', () => {
    const input = '2025-03-30T10:00:00.000Z';

    const result = DateTime.fromISO(input, { zone: 'Europe/Madrid' });
    const expectedResultForMadrileanGuy = '2025-03-30T12:00:00.000+02:00';

    expect(result.toISO()).toStrictEqual(expectedResultForMadrileanGuy);
  });

  it('should take into account time zone when parsing', () => {
    const input = '2024-01-01T15:00:00.000Z';
    const result = dateTimeSchema.safeParse(input);

    expect(result.success).toBeTruthy();
    expect(result.data?.toISO()).toBe(input);
  });
});
