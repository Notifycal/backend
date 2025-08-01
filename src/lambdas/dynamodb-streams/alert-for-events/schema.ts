import { insufficientCreditReminderNotSentEventSchema } from '@model/app-events/InsufficientCreditsReminderNotSentEvent';
import { lowCreditsDetectedEventSchema } from '@model/app-events/LowCreditsDetectedEvent';
import { dynamoDbStreamsSchema } from '@model/lambda-events/DynamoDbStreamsEvents';
import { auditTrailStoreRecordSchema } from '@model/store/AuditTrailStoreRecord';
import { z } from 'zod';
import type { AlertForEventsConfig } from './config';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const lcdShape = lowCreditsDetectedEventSchema.shape;
const auditTrailLowCreditDetectedSchema = auditTrailStoreRecordSchema<
  typeof lcdShape.eventType,
  typeof lcdShape.data,
  typeof lcdShape.idp,
  typeof lcdShape.idpId,
  typeof lcdShape.userId,
  typeof lowCreditsDetectedEventSchema
>(lowCreditsDetectedEventSchema);
export type AuditTrailLowCreditDetectedEvent = z.infer<typeof auditTrailLowCreditDetectedSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const icrnsShape = insufficientCreditReminderNotSentEventSchema.shape;
const auditTrailInsufficientCreditReminderNotSentEventSchema = auditTrailStoreRecordSchema<
  typeof icrnsShape.eventType,
  typeof icrnsShape.data,
  typeof icrnsShape.idp,
  typeof icrnsShape.idpId,
  typeof icrnsShape.userId,
  typeof insufficientCreditReminderNotSentEventSchema
>(insufficientCreditReminderNotSentEventSchema);
export type AuditTrailInsufficientCreditReminderNotSentEvent = z.infer<
  typeof auditTrailInsufficientCreditReminderNotSentEventSchema
>;

export const payloadSchemas = z.union([
  auditTrailLowCreditDetectedSchema,
  auditTrailInsufficientCreditReminderNotSentEventSchema
]);

export const eventSchema = dynamoDbStreamsSchema<typeof payloadSchemas, AlertForEventsConfig>(
  payloadSchemas
);

export type Event = z.infer<typeof eventSchema>;
export type Record = Event['Records'][number];
