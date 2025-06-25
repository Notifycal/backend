import type { AuthedEndpointConfig, PaymentPlansEndpointConfig } from '@model/Config';
import type { Environment, Url } from '@own-types/model';
import {
  readAuthedEndpointConfig,
  readEnv,
  readPaymentPlans,
  readStripeAuthConfig,
  readUserBaseStoreConfig
} from '@services/common/config';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import { promiseTry } from '@utils/promises';

export interface StripeCheckoutConfig {
  successRedirectUrlPath: Url;
  cancelRedirectUrlPath: Url;
  taxId: string;
}

export interface StripeCheckoutEndpointConfig {
  stripeCheckoutConfig: StripeCheckoutConfig;
}

export interface StripeAuthConfig {
  apiKey: string;
}

export interface StripeAuthEndpointConfig {
  stripeAuthConfig: StripeAuthConfig;
}

export type PostPaymentCheckoutSessionConfig = AuthedEndpointConfig &
  StripeCheckoutEndpointConfig &
  PaymentPlansEndpointConfig &
  StripeAuthEndpointConfig &
  UserBaseStoreEndpointConfig;

function readStripeConfig(env: Environment): StripeCheckoutEndpointConfig {
  return {
    stripeCheckoutConfig: {
      successRedirectUrlPath: env
        .get('STRIPE_SUCCESS_REDIRECT_URL_PATH')
        .required()
        .asString() as Url,
      cancelRedirectUrlPath: env
        .get('STRIPE_CANCEL_REDIRECT_URL_PATH')
        .required()
        .asString() as Url,
      taxId: env.get('STRIPE_TAX_ID').required().asString()
    }
  };
}

export function readPostPaymentCheckoutSessionConfig(): Promise<PostPaymentCheckoutSessionConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAuthedEndpointConfig(env),
    ...readStripeConfig(env),
    ...readPaymentPlans(env),
    ...readStripeAuthConfig(env),
    ...readUserBaseStoreConfig(env)
  }));
}
