import type { PaymentPlansEndpointConfig, PaymentWebhookTopicConfig } from '@model/Config';
import {
  readEnv,
  readPaymentPlans,
  readPaymentUserIndexConfig,
  readPaymentWebhookTopicConfig,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { PaymentUserIndexStoreEndpointConfig } from '@services/stores/payment-user-index-store';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
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
