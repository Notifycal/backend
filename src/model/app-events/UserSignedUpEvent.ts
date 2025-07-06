import type { Identity, IdpName } from '@notifycal/shared/types';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase, toEventSourceIdentity } from './common';

const data = z.object({});
export const userSignedUpEventSchema = eventSchemaGenerator('UserSignUpSucceeded', data);

export type UserSignedUpEvent = z.infer<typeof userSignedUpEventSchema>;

export function userSignedUp<TIdpName extends IdpName>(
  identity: Identity<TIdpName>
): UserSignedUpEvent {
  return {
    ...createEventBase('UserSignUpSucceeded', toEventSourceIdentity(identity)),
    data: {}
  };
}
