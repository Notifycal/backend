import type { DateTime, Percentage, TimeZone, UnixTimestamp } from '@notifycal/shared/types';
import type { Period } from '@own-types/model';
import { DateTime as DT } from 'luxon';
import type { z } from 'zod';

export function isWithinBoundaries(
  startTime: DateTime,
  lowerBoundary: DateTime,
  upperBoundary: DateTime
): boolean {
  const time = new Date(startTime);
  return (
    new Date(lowerBoundary).getTime() <= time.getTime() &&
    new Date(upperBoundary).getTime() >= time.getTime()
  );
}

export function areSameDay(date1: DateTime, date2: DateTime, date3: DateTime): boolean {
  const d1 = DT.fromISO(date1, { zone: 'utc' });
  const d2 = DT.fromISO(date2, { zone: 'utc' });
  const d3 = DT.fromISO(date3, { zone: 'utc' });

  return d1.hasSame(d2, 'day') && d2.hasSame(d3, 'day');
}

export function timezoneValidator(arg: TimeZone, ctx?: z.RefinementCtx): boolean {
  if (!arg) {
    if (ctx) {
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid timezone: timezone is required',
        fatal: true
      });
    }
    return false;
  }

  const dt = DT.now().setZone(arg);
  if (!dt.isValid) {
    if (ctx) {
      ctx.addIssue({
        code: 'custom',
        message: `Invalid timezone: ${dt.invalidReason || 'invalid format - not in IANA TZDB format'}`,
        fatal: true
      });
    }
    return false;
  }
  return true;
}

export function remainingPeriodPercentage(period: Period, now: UnixTimestamp): Percentage {
  const totalPeriodDuration = period.end - period.start;
  if (totalPeriodDuration <= 0) {
    return 0 as Percentage;
  }
  if (now < period.start || now >= period.end) {
    return 0 as Percentage;
  }
  const remainingDuration = period.end - now;
  const percentage = (remainingDuration / totalPeriodDuration) * 100;
  const factor = 10 ** 5;
  return Math.trunc(percentage * factor) / factor;
}
