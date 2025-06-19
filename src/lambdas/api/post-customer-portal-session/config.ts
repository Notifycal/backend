import type { AuthedEndpointConfig } from '@model/Config';
import type { Environment, Url } from '@own-types/model';
import {
  readAuthedEndpointConfig,
  readEnv,
  readStripeAuthConfig,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';

export interface StripeCustomerPortalConfig {
  returnUrl: Url;
}

export interface StripeCustomerPortalEndpointConfig {
  stripeCustomerPortalConfig: StripeCustomerPortalConfig;
}

export interface StripeAuthConfig {
  apiKey: string;
}

export interface StripeAuthEndpointConfig {
  stripeAuthConfig: StripeAuthConfig;
}

export type PostCustomerPortalSessionConfig = AuthedEndpointConfig &
  StripeCustomerPortalEndpointConfig &
  StripeAuthEndpointConfig &
  UserBaseStoreEndpointConfig;

function readStripeConfig(env: Environment): StripeCustomerPortalEndpointConfig {
  return {
    stripeCustomerPortalConfig: {
      returnUrl: env.get('STRIPE_CUSTOMER_PORTAL_RETURN_URL').required().asString() as Url
    }
  };
}

export function readPostCustomerPortalSessionConfig(): Promise<PostCustomerPortalSessionConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAuthedEndpointConfig(env),
    ...readStripeConfig(env),
    ...readStripeAuthConfig(env),
    ...readUserBaseStoreConfig(env)
  }));
}
