import type { PaymentUserStoreRecord } from '@model/store/UserPaymentStoreRecord';
import type { IdpName, StripeCustomerId } from '@notifycal/shared/types';
import { IndexStore, type IndexStoreConfig } from '@services/common/index-store';

export type PaymentUserIndexStoreConfig = IndexStoreConfig;
export type PaymentUserIndexStoreEndpointConfig = {
  paymentUserIndexStoreConfig: PaymentUserIndexStoreConfig;
};

export class PaymentUserIndexStore<
  TIdpName extends IdpName
> extends IndexStore<PaymentUserIndexStoreConfig> {
  public static withConfig<TIdpName extends IdpName>(
    config: PaymentUserIndexStoreConfig
  ): PaymentUserIndexStore<TIdpName> {
    return new PaymentUserIndexStore<TIdpName>(config);
  }

  private constructor(config: PaymentUserIndexStoreConfig) {
    super(config);
  }

  public getIdentityByStripeCustomerId(
    id: StripeCustomerId
  ): Promise<PaymentUserStoreRecord<TIdpName> | undefined> {
    const getCommand = {
      KeyConditionExpression: 'StripeCustomerId = :stripeCustomerId',
      ExpressionAttributeValues: {
        ':stripeCustomerId': id
      }
    };

    return super.getCommandRunner<PaymentUserStoreRecord<TIdpName>>(getCommand);
  }
}
