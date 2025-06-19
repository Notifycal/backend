import type { PaymentPlansEndpointConfig, PaymentWebhookTopicConfig } from '@model/Config';
import {
  readEnv,
  readPaymentPlans,
  readPaymentWebhookTopicConfig,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';

export type StripeWebhookConfig = UserBaseStoreEndpointConfig &
  PaymentPlansEndpointConfig &
  PaymentWebhookTopicConfig;

export function readStripeWebhookConfig(): Promise<StripeWebhookConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readUserBaseStoreConfig(env),
    ...readPaymentPlans(env),
    ...readPaymentWebhookTopicConfig(env)
  }));
}
