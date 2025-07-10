import {
  correlationIdSchema,
  eventTypeSchema,
  googleIdpSchema,
  notApplicableSchema,
  systemEventTypeSchema,
  systemSchema
} from '@model/app-events/BaseEvent';
import { eventIdSchema } from '@model/app-events/common';
import type { CapitalizeKeys } from '@model/UserIdentity';
import { dateTimeSchema, idpIdSchema, userIdSchema } from '@notifycal/shared/schemas';
import type { Brand, Identity, IdpName } from '@notifycal/shared/types';
import { z } from 'zod';

export const dataSchema = z.object({}).passthrough();
export type Data = z.infer<typeof dataSchema>;

export type AuditTrailStoreRecordOrigin = Brand<string, 'AuditTrailStoreRecordOrigin'>;
const originSchema = z.string().transform((data) => data as AuditTrailStoreRecordOrigin);

export const genericAuditTrailStoreRecordSchema = z.object({
  UserId: z.union([userIdSchema, systemSchema]),
  IdpId: z.union([idpIdSchema, notApplicableSchema]),
  Idp: z.union([googleIdpSchema, notApplicableSchema]),
  EventType: z.union([eventTypeSchema, systemEventTypeSchema]),
  HappenedAt: dateTimeSchema,
  EventId: eventIdSchema,
  CorrelationId: correlationIdSchema,
  Data: dataSchema,
  Origin: originSchema
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function auditTrailStoreRecordSchema<
  TEventType extends z.ZodTypeAny,
  TData extends z.ZodTypeAny,
  TIdp extends z.ZodTypeAny,
  TIdpId extends z.ZodTypeAny,
  TUserId extends z.ZodTypeAny,
  TEventSchema extends z.ZodObject<{
    eventType: TEventType;
    data: TData;
    idp: TIdp;
    idpId: TIdpId;
    userId: TUserId;
  }>
>(eventSchema: TEventSchema) {
  return genericAuditTrailStoreRecordSchema.extend({
    EventType: eventSchema.shape.eventType,
    Data: eventSchema.shape.data,
    Idp: eventSchema.shape.idp,
    IdpId: eventSchema.shape.idpId,
    UserId: eventSchema.shape.userId
  });
}

export type AuditTrailStoreRecord = z.infer<typeof genericAuditTrailStoreRecordSchema>;

type IdentityNoEmail<TIdpName extends IdpName> = Omit<Identity<TIdpName>, 'email'>;
export function extractIdentity<TIdpName extends IdpName>(
  event: CapitalizeKeys<IdentityNoEmail<TIdpName>>
): IdentityNoEmail<TIdpName> {
  return {
    userId: event.UserId,
    idp: event.Idp,
    idpId: event.IdpId
  };
}