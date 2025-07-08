import { actionableEventFoundEventSchema } from '@model/app-events/ActionableEventFoundEvent';
import { noPhoneNumberForCalendarEventFoundEventSchema } from '@model/app-events/NoPhoneNumberForCalendarEventFoundEvent';
import { createDynamoDBStreamEventSchema } from '@model/lambda-events/DynamoDBStreamEvents';
import { auditTrailStoreRecordSchema } from '@model/store/AuditTrailStoreRecord';
import { z } from 'zod';

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

export const eventSchema = createDynamoDBStreamEventSchema(payloadSchemas);

export type Event = z.infer<typeof eventSchema>;
export type Record = Event['Records'][number];
