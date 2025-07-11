import { DynamoDBMarshalled } from '@aws-lambda-powertools/parser/helpers/dynamodb';
import { DynamoDBStreamSchema } from '@aws-lambda-powertools/parser/schemas';
import { insufficientCreditReminderNotSentEventSchema } from '@model/app-events/InsufficientCreditsReminderNotSentEvent';
import { lowCreditsDetectedEventSchema } from '@model/app-events/LowCreditsDetectedEvent';
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

const dynamodbSchema = DynamoDBStreamSchema.shape.Records.element.shape.dynamodb
  .innerType()
  .extend({
    NewImage: DynamoDBMarshalled(payloadSchemas)
  });

const extendedRecordSchema = DynamoDBStreamSchema.shape.Records.element.extend({
  dynamodb: dynamodbSchema
});

export const eventSchema = z.object({
  lambdaConfig: z.custom<AlertForEventsConfig>(),
  Records: extendedRecordSchema.array()
});

export type Event = z.infer<typeof eventSchema>;
export type Record = Event['Records'][number];
