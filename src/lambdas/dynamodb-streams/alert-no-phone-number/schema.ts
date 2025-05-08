import { DynamoDBMarshalled } from '@aws-lambda-powertools/parser/helpers/dynamodb';
import { DynamoDBStreamSchema } from '@aws-lambda-powertools/parser/schemas';
import { actionableEventFoundEventSchema } from '@model/app-events/ActionableEventFoundEvent';
import { noPhoneNumberForCalendarEventFoundEventSchema } from '@model/app-events/NoPhoneNumberForCalendarEventFoundEvent';
import { auditTrailStoreRecordSchema } from '@model/store/AuditTrailStoreRecord';
import { z } from 'zod';
import type { AlertNoPhoneNumberConfig } from './config';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const actionableEventFoundShape = actionableEventFoundEventSchema.shape;
const auditTrailActionableEventFoundSchema = auditTrailStoreRecordSchema<
  typeof actionableEventFoundShape.eventType,
  typeof actionableEventFoundShape.data,
  typeof actionableEventFoundShape.idp,
  typeof actionableEventFoundShape.idpId,
  typeof actionableEventFoundShape.userId,
  typeof actionableEventFoundEventSchema
>(actionableEventFoundEventSchema);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const noPhoneNumberForCalendarEventFoundEventShape =
  noPhoneNumberForCalendarEventFoundEventSchema.shape;
const auditTrailNoPhoneNumberForCalendarEventFoundEventSchema = auditTrailStoreRecordSchema<
  typeof noPhoneNumberForCalendarEventFoundEventShape.eventType,
  typeof noPhoneNumberForCalendarEventFoundEventShape.data,
  typeof noPhoneNumberForCalendarEventFoundEventShape.idp,
  typeof noPhoneNumberForCalendarEventFoundEventShape.idpId,
  typeof noPhoneNumberForCalendarEventFoundEventShape.userId,
  typeof noPhoneNumberForCalendarEventFoundEventSchema
>(noPhoneNumberForCalendarEventFoundEventSchema);

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
  lambdaConfig: z.custom<AlertNoPhoneNumberConfig>(),
  Records: extendedRecordSchema.array()
});
export type Event = z.infer<typeof eventSchema>;
export type Record = Event['Records'][number]['dynamodb'];
