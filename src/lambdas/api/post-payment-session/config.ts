import type { AuthedEndpointConfig } from '@model/Config';
import type { Environment, Url } from '@own-types/model';
import { readAuthedEndpointConfig, readEnv } from '@services/common/config';
import { promiseTry } from '@utils/promises';

export const tierIdMap = {
  good: 'good' as const,
  better: 'better' as const,
  best: 'best' as const
};
export interface Tier {
  id: (typeof tierIdMap)[keyof typeof tierIdMap];
  priceId: string;
}

export interface Tiers {
  good: Tier;
  better: Tier;
  best: Tier;
}

export interface StripeCheckoutConfig {
  tiers: Tiers;
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
  StripeAuthEndpointConfig;

function readStripeConfig(env: Environment): StripeCheckoutEndpointConfig {
  return {
    stripeCheckoutConfig: {
      tiers: {
        good: {
          id: tierIdMap.good,
          priceId: env.get('STRIPE_GOOD_TIER_PRICE_ID').required().asString()
        },
        better: {
          id: tierIdMap.better,
          priceId: env.get('STRIPE_BETTER_TIER_PRICE_ID').required().asString()
        },
        best: {
          id: tierIdMap.best,
          priceId: env.get('STRIPE_BEST_TIER_PRICE_ID').required().asString()
        }
      },
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
    ...readStripeAuthConfig(env)
  }));
}
