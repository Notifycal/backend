import type { DateTime } from '@notifycal/shared/types';

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
