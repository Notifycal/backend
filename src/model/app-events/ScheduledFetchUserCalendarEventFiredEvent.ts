import type { Event } from '@lambdas/schedule/fetch-user-calendars/index';
import type { CronRunConfig } from '@model/Config';
import type { CorrelationId, DateTime, EventId } from '@notifycal/shared/types';
import { v4 } from 'uuid';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';

const data = z.object({
  originalAwsEvent: z.any(),
  cronRunConfig: z.any()
});
export const ScheduledFetchUserCalendarEventFiredEventSchema = eventSchemaGenerator(
  'ScheduledFetchUserCalendarEventFired',
  data
);

export type ScheduledFetchUserCalendarEventFiredEvent = z.infer<
  typeof ScheduledFetchUserCalendarEventFiredEventSchema
>;

export function scheduledFetchUserCalendarEventFired(
  origin: Event,
  config: CronRunConfig
): ScheduledFetchUserCalendarEventFiredEvent {
  return {
    eventId: v4() as EventId,
    correlationId: origin.id as CorrelationId,
    eventType: 'ScheduledFetchUserCalendarEventFired',
    happenedAt: new Date().toISOString() as DateTime,
    userId: 'System',
    idp: 'N/A',
    idpId: 'N/A',
    data: {
      originalAwsEvent: origin,
      cronRunConfig: config
    }
  };
}
