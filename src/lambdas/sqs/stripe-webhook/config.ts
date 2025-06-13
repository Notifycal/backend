import type { PaymentPlansEndpointConfig } from '@model/Config';
import { readEnv, readPaymentPlans, readUserBaseStoreConfig } from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';

export type StripeWebhookConfig = UserBaseStoreEndpointConfig & PaymentPlansEndpointConfig;

export function readStripeWebhookConfig(): Promise<StripeWebhookConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readUserBaseStoreConfig(env),
    ...readPaymentPlans(env)
  }));
}
