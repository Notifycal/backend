import { userCalendarFetchedEventSchema } from '@model/app-events/UserCalendarFetchedEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { z } from 'zod';
import type { ActionableEventsConfig } from './config';

export const eventSchema = eventSqsSchema<
  ActionableEventsConfig,
  typeof userCalendarFetchedEventSchema
>(userCalendarFetchedEventSchema);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;
