import { type UserIdentity, extractIdentity } from '@model/UserIdentity';
import type {
  IdpName,
  StripeCustomerId,
  TierId,
  UnixTimestamp,
  User,
  UserCredits,
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
export type UserStoreRecordCredits = Required<Pick<UserStoreRecord<unknown>, 'Credits'>>;

export interface UserStoreRecord<TIdpName> extends UserIdentity<TIdpName> {
  LastSignInAt: UnixTimestamp;
  SignedUpAt: UnixTimestamp;
  UserStatus: UserStatus;
  Config?: ReminderConfigStoreRecord;
  Credits?: UserCreditsRecordStore;
  StripeCustomerId?: StripeCustomerId;
}

function extractCredits(creditsRecord: UserCreditsRecordStore): UserCredits {
  return {
    subscriptionCreditBalance: creditsRecord.SubscriptionCreditBalance,
    tier: creditsRecord.Tier,
    topupCreditBalance: creditsRecord.TopupCreditBalance
  };
}

export function extractUser<TIdpName extends IdpName>(
  userRecord: UserStoreRecord<TIdpName>
): User<TIdpName> {
  return {
    ...extractIdentity(userRecord),
    lastSignInAt: userRecord.LastSignInAt,
    signedUpAt: userRecord.SignedUpAt,
    userStatus: userRecord.UserStatus,
    config: userRecord.Config ? fromStoreRecord(userRecord.Config) : undefined,
    credits: userRecord.Credits ? extractCredits(userRecord.Credits) : undefined
  };
}
