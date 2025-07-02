import { type UserIdentity, extractIdentity } from '@model/UserIdentity';
import type {
  IdpName,
  StripeCustomerId,
  TierId,
  UnixTimestamp,
  User,
  UserStatus
} from '@notifycal/shared/types';
import { type ReminderConfigStoreRecord, fromStoreRecord } from './ReminderConfigStoreRecord';

export interface UserCreditsRecordStore {
  SubscriptionCreditBalance: number;
  Tier: TierId;
  TopupCreditBalance: number;
}

export type CreditBalanceType = keyof Pick<
  UserCreditsRecordStore,
  'SubscriptionCreditBalance' | 'TopupCreditBalance'
>;

export interface UserStoreRecord<TIdpName> extends UserIdentity<TIdpName> {
  LastSignInAt: UnixTimestamp;
  SignedUpAt: UnixTimestamp;
  UserStatus: UserStatus;
  Config?: ReminderConfigStoreRecord;
  Credits?: UserCreditsRecordStore;
  StripeCustomerId?: StripeCustomerId;
}

export function extractUser<TIdpName extends IdpName>(
  userRecord: UserStoreRecord<TIdpName>
): User<TIdpName> {
  return {
    ...extractIdentity(userRecord),
    lastSignInAt: userRecord.LastSignInAt,
    signedUpAt: userRecord.SignedUpAt,
    userStatus: userRecord.UserStatus,
    config: userRecord.Config ? fromStoreRecord(userRecord.Config) : undefined
  };
}
