import type { DateTime, TimeZone } from '@notifycal/shared/types';
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
