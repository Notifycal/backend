import { DynamoDBMarshalled } from '@aws-lambda-powertools/parser/helpers/dynamodb';
import { DynamoDBStreamSchema } from '@aws-lambda-powertools/parser/schemas';
import { actionableEventFoundEventSchema } from '@model/app-events/ActionableEventFoundEvent';
import { noPhoneNumberForCalendarEventFoundEventSchema } from '@model/app-events/NoPhoneNumberForCalendarEventFoundEvent';
import { auditTrailStoreRecordSchema } from '@model/store/AuditTrailStoreRecord';
import { z } from 'zod';
import type { AlertForMissingPhoneNumberConfig } from './config';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const aefShape = actionableEventFoundEventSchema.shape;
const auditTrailActionableEventFoundSchema = auditTrailStoreRecordSchema<
  typeof aefShape.eventType,
  typeof aefShape.data,
  typeof aefShape.idp,
  typeof aefShape.idpId,
  typeof aefShape.userId,
  typeof actionableEventFoundEventSchema
>(actionableEventFoundEventSchema);
export type AuditTrailActionableEventFoundEvent = z.infer<
  typeof auditTrailActionableEventFoundSchema
>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const npnfcefShape = noPhoneNumberForCalendarEventFoundEventSchema.shape;
const auditTrailNoPhoneNumberForCalendarEventFoundEventSchema = auditTrailStoreRecordSchema<
  typeof npnfcefShape.eventType,
  typeof npnfcefShape.data,
  typeof npnfcefShape.idp,
  typeof npnfcefShape.idpId,
  typeof npnfcefShape.userId,
  typeof noPhoneNumberForCalendarEventFoundEventSchema
>(noPhoneNumberForCalendarEventFoundEventSchema);
export type AuditTrailNoPhoneNumberForCalendarEventFoundEvent = z.infer<
  typeof auditTrailNoPhoneNumberForCalendarEventFoundEventSchema
>;

export const payloadSchemas = z.union([
  auditTrailActionableEventFoundSchema,
  auditTrailNoPhoneNumberForCalendarEventFoundEventSchema
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
  lambdaConfig: z.custom<AlertForMissingPhoneNumberConfig>(),
  Records: extendedRecordSchema.array()
});
export type Event = z.infer<typeof eventSchema>;
export type Record = Event['Records'][number]['dynamodb'];
