import type { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { emailToBeSentAttemptSentEventSchema } from './EmailToBeSentAttemptSentEvent';

export const emailToBeSentAttemptSkippedEventEventSchema = eventSchemaGenerator(
  'EmailToBeSentAttemptSkipped',
  emailToBeSentAttemptSentEventSchema.shape.data
);

export type EmailToBeSentAttemptSkippedEvent = z.infer<
  typeof emailToBeSentAttemptSkippedEventEventSchema
>;
