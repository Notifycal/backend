import type { AuthedEndpointConfig, PaymentPlansEndpointConfig } from '@model/Config';
import type { Environment, Url } from '@own-types/model';
import { readAuthedEndpointConfig, readEnv, readPaymentPlans } from '@services/common/config';
import { promiseTry } from '@utils/promises';

export interface StripeCheckoutConfig {
  successRedirectUrl: Url;
  cancelRedirectUrl: Url;
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
      successRedirectUrl: env.get('STRIPE_SUCCESS_REDIRECT_URL').required().asString() as Url,
      cancelRedirectUrl: env.get('STRIPE_CANCEL_REDIRECT_URL').required().asString() as Url
    }
  };
}

function readStripeAuthConfig(env: Environment): StripeAuthEndpointConfig {
  return {
    stripeAuthConfig: {
      apiKey: env.get('STRIPE_API_KEY').required().asString()
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
