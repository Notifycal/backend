import type { IdpName, UserIdentity } from '@notifycal/shared/types';
import { z } from 'zod';
import { eventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const data = z.object({});
export const userSignedUpEventSchema = eventSchemaGenerator('UserSignUpSucceeded', data);

export type UserSignedUpEvent = z.infer<typeof userSignedUpEventSchema>;

export function userSignedUp<TIdpName extends IdpName>(
  userIdentity: UserIdentity<TIdpName>
): UserSignedUpEvent {
  return {
    ...createEventBase('UserSignUpSucceeded', userIdentity),
    data: {}
  };
}
