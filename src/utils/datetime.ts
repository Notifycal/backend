import type { DateTime, Percentage, TimeZone, UnixTimestamp } from '@notifycal/shared/types';
import type { Period } from '@own-types/model';
import { DateTime as DT } from 'luxon';
import { z } from 'zod';

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

export function timezoneValidator(): (arg: TimeZone, ctx: z.RefinementCtx) => boolean {
  return (data, context) => {
    const dt = DT.now().setZone(data);
    if (!data || !dt.isValid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid timezone: ${dt.invalidReason || 'invalid format - not in IANA TZDB format'}`,
        fatal: true
      });
      return false;
    }
    return true;
  };
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