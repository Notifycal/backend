import type { UserIdentityStoreRecord } from '@model/UserIdentity';

import type { Brand, StripeCustomerId } from '@notifycal/shared/types';

// TODO: extract to shared
export type StripeSubscriptionId = Brand<string, 'StripeSubscriptionId'>;

export interface PaymentUserStoreRecord<TIdpName> extends UserIdentityStoreRecord<TIdpName> {
  StripeCustomerId: StripeCustomerId;
  StripeSubscriptionId: StripeSubscriptionId;
}
