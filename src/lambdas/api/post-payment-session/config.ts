import type { AuthedEndpointConfig, PaymentPlansEndpointConfig } from '@model/Config';
import type { Environment, Url } from '@own-types/model';
import {
  readAuthedEndpointConfig,
  readEnv,
  readPaymentPlans,
  readStripeAuthConfig
} from '@services/common/config';
import { promiseTry } from '@utils/promises';

export interface StripeCheckoutConfig {
  successRedirectUrlPath: Url;
  cancelRedirectUrlPath: Url;
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
  StripeAuthEndpointConfig;

function readStripeConfig(env: Environment): StripeCheckoutEndpointConfig {
  return {
    stripeCheckoutConfig: {
      successRedirectUrlPath: env
        .get('STRIPE_SUCCESS_REDIRECT_URL_PATH')
        .required()
        .asString() as Url,
      cancelRedirectUrlPath: env.get('STRIPE_CANCEL_REDIRECT_URL_PATH').required().asString() as Url
    }
  };
}

export function readPostPaymentCheckoutSessionConfig(): Promise<PostPaymentCheckoutSessionConfig> {
  const env = readEnv();
  return promiseTry(() => ({
    ...readAuthedEndpointConfig(env),
    ...readStripeConfig(env),
    ...readPaymentPlans(env),
    ...readStripeAuthConfig(env)
  }));
}
