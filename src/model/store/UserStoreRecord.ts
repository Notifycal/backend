import type { BusinessAddress, BusinessName, UnixTimestamp } from '@own-types/model';
import type { Calendar } from '../Calendar';
import type { Identity, IdpName } from '../Identity';

export type UserStatus = 'banned' | 'onboarding' | 'live';

type CapitalizeKeys<T> = {
  [K in keyof T as Capitalize<K & string>]: T[K];
};

type UserIdentity<TIdpName> = CapitalizeKeys<Identity<TIdpName>>;
export interface UserStoreRecord<TIdpName> extends UserIdentity<TIdpName> {
  LastSignInAt: UnixTimestamp;
  SignedUpAt: UnixTimestamp;
  UserStatus: UserStatus;
}
export function extractIdentity<TIdpName extends IdpName>(
  user: UserStoreRecord<TIdpName>
): Identity<TIdpName> {
  return {
    userId: user.UserId,
    email: user.Email,
    idp: user.Idp,
    idpId: user.IdpId
  };
}

export interface ReminderConfig {
  calendars: Array<Calendar>;
  businessName: BusinessName;
  businessAddress: BusinessAddress;
}
