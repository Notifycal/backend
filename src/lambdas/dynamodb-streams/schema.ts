import { actionableEventFoundEventSchema } from '@model/app-events/ActionableEventFoundEvent';
import { noPhoneNumberForCalendarEventFoundEventSchema } from '@model/app-events/NoPhoneNumberForCalendarEventFoundEvent';
import { dynamoDbStreamSchema } from '@model/lambda-events/DynamoDbStreamEvents';
import { z } from 'zod';
import type { AlertNoPhoneNumberConfig } from './config';

const schemas = z.union([
  actionableEventFoundEventSchema,
  noPhoneNumberForCalendarEventFoundEventSchema
]);
export const eventSchema = dynamoDbStreamSchema<AlertNoPhoneNumberConfig, typeof schemas>(schemas);
export type Event = z.infer<typeof eventSchema>;
export type Record = z.infer<typeof eventSchema.shape.Records.element>;
