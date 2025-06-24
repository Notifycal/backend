import type { PaymentPlansEndpointConfig, PaymentWebhookTopicConfig } from '@model/Config';
import {
  readEnv,
  readPaymentPlans,
  readPaymentUserIndexConfig,
  readPaymentWebhookTopicConfig,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import type { PaymentUserIndexStoreEndpointConfig } from '@services/stores/user-payment-index-store';
import { promiseTry } from '@utils/promises';

export type StripeWebhookConfig = UserBaseStoreEndpointConfig &
  PaymentPlansEndpointConfig &
  PaymentWebhookTopicConfig &
  PaymentUserIndexStoreEndpointConfig;

export function readStripeWebhookConfig(): Promise<StripeWebhookConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readUserBaseStoreConfig(env),
    ...readPaymentUserIndexConfig(env),
    ...readPaymentPlans(env),
    ...readPaymentWebhookTopicConfig(env)
  }));
}
