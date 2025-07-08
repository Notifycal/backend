import { insufficientCreditReminderNotSentEventSchema } from '@model/app-events/InsufficientCreditReminderNotSentEvent';
import { lowCreditsDetectedEventSchema } from '@model/app-events/LowCreditsDetectedEvent';
import { createDynamoDBStreamEventSchema } from '@model/lambda-events/DynamoDBStreamEvents';
import { auditTrailStoreRecordSchema } from '@model/store/AuditTrailStoreRecord';
import { z } from 'zod';

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

export const eventSchema = createDynamoDBStreamEventSchema(payloadSchemas);

export type Event = z.infer<typeof eventSchema>;
export type Record = Event['Records'][number];
