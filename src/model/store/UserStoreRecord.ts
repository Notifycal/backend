import { type UserIdentityStoreRecord, extractUserIdentity } from '@model/UserIdentity';
import type {
  IdpName,
  StripeCustomerId,
  TierId,
  UnixTimestamp,
  User,
  UserCredits,
  UserStatus
} from '@notifycal/shared/types';
import {
  type ReminderConfigStoreRecord,
  fromStoreRecord as reminderFromStoreRecord
} from './ReminderConfigStoreRecord';
import type { StripeSubscriptionId } from './UserPaymentStoreRecord';

export interface UserCreditsRecordStore {
  SubscriptionCreditBalance: number;
  Tier: TierId;
  TopupCreditBalance: number;
}

function fromStoreRecord(credits: UserCreditsRecordStore): UserCredits {
  return {
    subscriptionCreditBalance: credits.SubscriptionCreditBalance,
    tier: credits.Tier,
    topupCreditBalance: credits.TopupCreditBalance
  };
}

export type CreditBalanceType = keyof Pick<
  UserCreditsRecordStore,
  'SubscriptionCreditBalance' | 'TopupCreditBalance'
>;
export type UserStoreRecordCredits = Required<Pick<UserStoreRecord<unknown>, 'Credits'>>;

export interface UserStoreRecord<TIdpName> extends UserIdentityStoreRecord<TIdpName> {
  LastSignInAt: UnixTimestamp;
  SignedUpAt: UnixTimestamp;
  UserStatus: UserStatus;
  Config?: ReminderConfigStoreRecord;
  Credits?: UserCreditsRecordStore;
  StripeCustomerId?: StripeCustomerId;
  StripeSubscriptionId?: StripeSubscriptionId;
  DemoReminderCount?: number;
}

export function extractUser<TIdpName extends IdpName>(
  userRecord: UserStoreRecord<TIdpName>
): User<TIdpName> {
  return {
    ...extractUserIdentity(userRecord),
    lastSignInAt: userRecord.LastSignInAt,
    signedUpAt: userRecord.SignedUpAt,
    userStatus: userRecord.UserStatus,
    ...(userRecord.Config && { config: reminderFromStoreRecord(userRecord.Config) }),
    ...(userRecord.Credits && { credits: fromStoreRecord(userRecord.Credits) }),
    ...(userRecord.DemoReminderCount && { demoReminderCount: userRecord.DemoReminderCount }),
    ...(userRecord.StripeSubscriptionId && {
      stripeSubscriptionId: userRecord.StripeSubscriptionId
    })
  };
}
