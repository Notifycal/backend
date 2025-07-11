import type { IdpName, UserIdentity } from '@notifycal/shared/types';
import { z } from 'zod';
import { errorEventSchemaGenerator } from './BaseEvent';
import { createEventBase } from './common';

const data = z.object({});
export const userSignUpFailedEventSchema = errorEventSchemaGenerator('UserSignUpFailed', data);

export type UserSignUpFailedEvent = z.infer<typeof userSignUpFailedEventSchema>;

export function userSignUpFailed<TIdpName extends IdpName>(
  userIdentity: UserIdentity<TIdpName>
): UserSignUpFailedEvent {
  return {
    ...createEventBase('UserSignUpFailed', userIdentity),
    data: {}
  };
}
