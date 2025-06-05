// import { readEnv } from '@services/common/config';
import { promiseTry } from '@utils/promises';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type StripeWebhookConfig = {};

export function readStripeWebhookConfig(): Promise<StripeWebhookConfig> {
  // const env = readEnv();
  return promiseTry(() => ({}));
}

// TODO
