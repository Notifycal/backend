import type { UserIdentity } from '@model/UserIdentity';

import type { StripeCustomerId } from '@notifycal/shared/types';

export interface PaymentUserStoreRecord<TIdpName> extends UserIdentity<TIdpName> {
  StripeCustomerId: StripeCustomerId;
}
