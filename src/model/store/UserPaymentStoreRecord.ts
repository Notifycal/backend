import type { UserIdentityStoreRecord } from '@model/UserIdentity';

import type { StripeCustomerId } from '@notifycal/shared/types';

export interface PaymentUserStoreRecord<TIdpName> extends UserIdentityStoreRecord<TIdpName> {
  StripeCustomerId: StripeCustomerId;
}
