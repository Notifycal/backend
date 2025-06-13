import type { AlertEndpointConfig } from '@lambdas/dynamodb-streams/alert-for-missing-phone-number/config';
import type {
  ActionableEventFoundTopicConfig,
  Algorithm,
  ApiRestTopicConfig,
  AuthedEndpointConfig,
  CorsEndpointConfig,
  CronRunEndpointConfig,
  DecodeAccessJwtConfig,
  DecodeAccessJwtEndpointConfig,
  DecodeRefreshJwtConfig,
  DemoReminderToBeSentTopicConfig,
  EmailingEndpointConfig,
  EmailingSenderEndpointConfig,
  EmailingTopicConfig,
  EmailToBeSentTopicConfig,
  EncodeAccessJwtConfig,
  EncodeJwtsEndpointConfig,
  EncodeRefreshJwtConfig,
  IdempotencyPersistenceConfig,
  IdpEndpointConfig,
  MessagingEndpointConfig,
  MessagingTopicConfig,
  PaymentPlansEndpointConfig,
  PaymentWebhookTopicConfig,
  UserCalendarFetchedTopicConfig
} from '@model/Config';
import { tierIdMap } from '@model/PaymentPlans';
import type { MailgunEndpointConfig } from '@model/vendor/mailgun/config';
import type {
  DecodeVonageAccessJwtEndpointConfig,
  VonageConfig
} from '@model/vendor/vonage/config';
import type { Email } from '@notifycal/shared/types';
import type { AwsArn, Environment, PrivateKey, PublicKey, Url } from '@own-types/model';
import type {
  VonageApiKey,
  VonageApplicationId,
  VonageJwtSigningSecret
} from '@services/messaging';
import type { AlertsBaseStoreEndpointConfig } from '@services/stores/alerts-base-store';
import type { AuditTrailBaseStoreEndpointConfig } from '@services/stores/audit-trail-base-store';
import type { RefreshTokenBaseStoreConfigEndpointConfig } from '@services/stores/refresh-token-base-store';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import type { UserLiveIndexStoreEndpointConfig } from '@services/stores/user-live-index-store';
import { from } from 'env-var';

export function readEnv(): Environment {
  return from(process.env, {});
}

function readJwtConfig<
  TResult extends
    | Omit<EncodeAccessJwtConfig, 'secretOrPrivateKey'>
    | Omit<DecodeAccessJwtConfig, 'secretOrPublicKey'>
>(env: Environment, prefix: 'ACCESS' | 'REFRESH', expiresInDefault: string): TResult {
  return {
    algorithm: env.get(`${prefix}_JWT_ALGORITHM`).required().default('RS256').asString(),
    issuer: env.get(`${prefix}_JWT_ISSUER`).required().default('notifycal.com').asString(),
    audience: env.get(`${prefix}_JWT_AUDIENCE`).required().asString(),
    expiresIn: env.get(`${prefix}_JWT_EXPIRATION`).required().default(expiresInDefault).asString()
  } as TResult;
}

export function readBaseConfig(env: Environment): CorsEndpointConfig {
  return {
    corsConfig: {
      frontendDomain: env.get(`FRONTEND_DOMAIN`).required().asString()
    }
  };
}

function readEncodeAccessJwtConfig(env: Environment): EncodeAccessJwtConfig {
  return {
    secretOrPrivateKey: env.get(`ACCESS_JWT_PRIVATE_KEY`).required().asString() as PrivateKey,
    ...readJwtConfig<Omit<EncodeAccessJwtConfig, 'secretOrPrivateKey'>>(env, 'ACCESS', '5m')
  };
}

function readEncodeRefreshJwtConfig(env: Environment): EncodeRefreshJwtConfig {
  return {
    secretOrPrivateKey: env.get(`REFRESH_JWT_PRIVATE_KEY`).required().asString() as PrivateKey,
    ...readJwtConfig<Omit<EncodeAccessJwtConfig, 'secretOrPrivateKey'>>(env, 'REFRESH', '7d')
  };
}

export function readEncodeJwtsConfig(env: Environment): EncodeJwtsEndpointConfig {
  return {
    encodeAccessJwtConfig: readEncodeAccessJwtConfig(env),
    encodeRefreshJwtConfig: readEncodeRefreshJwtConfig(env)
  };
}

function _readDecodeAccessJwtConfig(env: Environment): DecodeAccessJwtConfig {
  return {
    secretOrPublicKey: env.get('ACCESS_JWT_PUBLIC_KEY').required().asString() as PublicKey,
    ...readJwtConfig<Omit<DecodeAccessJwtConfig, 'secretOrPublicKey'>>(env, 'ACCESS', '5m')
  };
}

export function readDecodeAccessJwtConfig(env: Environment): DecodeAccessJwtEndpointConfig {
  return {
    decodeAccessJwtConfig: _readDecodeAccessJwtConfig(env)
  };
}

export function readAuthedEndpointConfig(env: Environment): AuthedEndpointConfig {
  return {
    ...readDecodeAccessJwtConfig(env),
    ...readBaseConfig(env)
  };
}

export function readDecodeRefreshJwtConfig(env: Environment): DecodeRefreshJwtConfig {
  return {
    secretOrPublicKey: env.get('REFRESH_JWT_PUBLIC_KEY').required().asString() as PublicKey,
    ...readJwtConfig<Omit<DecodeAccessJwtConfig, 'secretOrPublicKey'>>(env, 'REFRESH', '7d')
  };
}

const userBaseTableEnvVarName = 'USERS_TABLE_NAME';
export function readUserBaseStoreConfig(env: Environment): UserBaseStoreEndpointConfig {
  return {
    userBaseStoreConfig: {
      tableName: env.get(userBaseTableEnvVarName).required().asString()
    }
  };
}

export function readUserLiveIndexConfig(env: Environment): UserLiveIndexStoreEndpointConfig {
  return {
    userLiveIndexStoreConfig: {
      tableName: env.get(userBaseTableEnvVarName).required().asString(),
      indexName: env.get('LIVE_USERS_INDEX_NAME').required().asString(),
      pageSize: env.get('USERS_PAGE_SIZE').default(100).asInt()
    }
  };
}

export function readUserCalendarFetchedTopicConfig(
  env: Environment
): UserCalendarFetchedTopicConfig {
  return {
    userCalendarFetchedTopicConfig: {
      topicArn: env.get('USER_CALENDAR_FETCHED_TOPIC_ARN').required().asString() as AwsArn
    }
  };
}

export function readCronRunConfig(env: Environment): CronRunEndpointConfig {
  return {
    cronRunConfig: {
      windowInMinutes: env.get('RUN_TIME_WINDOW_PERIOD_MINUTES').required().asIntPositive()
    }
  };
}

export function readActionableEventFoundTopicConfig(
  env: Environment
): ActionableEventFoundTopicConfig {
  return {
    actionableEventFoundTopicConfig: {
      topicArn: env.get('ACTIONABLE_EVENT_FOUND_TOPIC_ARN').required().asString() as AwsArn
    }
  };
}

export function readDemoReminderToBeSentTopicConfig(
  env: Environment
): DemoReminderToBeSentTopicConfig {
  return {
    demoReminderToBeSentTopicConfig: {
      topicArn: env.get('DEMO_REMINDER_TO_BE_SENT_TOPIC_ARN').required().asString() as AwsArn
    }
  };
}

export function readRefreshTokenStoreConfig(
  env: Environment
): RefreshTokenBaseStoreConfigEndpointConfig {
  return {
    refreshTokenBaseStoreConfig: {
      tableName: env.get('REFRESH_TOKENS_TABLE_NAME').required().asString()
    }
  };
}

export function readIdpConfigs(env: Environment): IdpEndpointConfig {
  return {
    idpConfigs: {
      'google.com': {
        clientId: env.get('GOOGLE_OAUTH_CLIENT_ID').required().asString(),
        clientSecret: env.get('GOOGLE_OAUTH_CLIENT_SECRET').required().asString(),
        redirectUriList: env
          .get('GOOGLE_OAUTH_CLIENT_REDIRECT_URI_LIST')
          .required()
          .asJsonArray() as Array<Url>
      }
    }
  };
}

export function readAuditTrailBaseStoreConfig(env: Environment): AuditTrailBaseStoreEndpointConfig {
  return {
    auditTrailBaseStoreConfig: {
      tableName: env.get('AUDIT_TRAIL_TABLE_NAME').required().asString()
    }
  };
}

export function readAlertsBaseStoreConfig(env: Environment): AlertsBaseStoreEndpointConfig {
  return {
    alertsBaseStoreConfig: {
      tableName: env.get('BUSINESS_ALERTS_TABLE_NAME').required().asString()
    }
  };
}

export function readIdempotencyPersistenceConfig(env: Environment): IdempotencyPersistenceConfig {
  return {
    idempotencyPersistenceConfig: env
      .get('IDEMPOTENCY_PERSISTENCE_CONFIG')
      .required()
      .asJsonObject()
  } as IdempotencyPersistenceConfig;
}

export function readMessagingTopicConfig(env: Environment): MessagingTopicConfig {
  return {
    messagingTopicConfig: {
      topicArn: env.get('MESSAGING_TOPIC_ARN').required().asString() as AwsArn
    }
  };
}

export function readMessagingConfig(env: Environment): MessagingEndpointConfig {
  return {
    messagingConfig: {
      enabled: env.get('MESSAGING_ENABLED').required().default('true').asBool()
    }
  };
}

export function readApiRestTopicConfig(env: Environment): ApiRestTopicConfig {
  return {
    apiRestTopicConfig: {
      topicArn: env.get('API_REST_TOPIC_ARN').required().asString() as AwsArn
    }
  };
}

export function readVonageConfig(env: Environment): VonageConfig {
  return {
    privateKeySSMPath: env.get('VONAGE_SSM_PATH_PRIVATE_KEY').required().asString(),
    applicationId: env.get('VONAGE_APPLICATION_ID').required().asString() as VonageApplicationId,
    webhookBaseURL: env.get('VONAGE_WEBHOOK_BASE_URL').required().asString() as Url
  };
}

export function readDecodeVonageJwtConfig(env: Environment): DecodeVonageAccessJwtEndpointConfig {
  return {
    decodeAccessJwtConfig: {
      applicationId: env.get('VONAGE_APPLICATION_ID').required().asString() as VonageApplicationId,
      apiKey: env.get('VONAGE_API_KEY').required().asString() as VonageApiKey,
      signingSecret: env
        .get('VONAGE_WEBHOOK_JWT_SIGNING_SECRET')
        .required()
        .asString() as VonageJwtSigningSecret,
      algorithm: env
        .get('VONAGE_JWT_ALGORITHM')
        .required()
        .default('HS256')
        .asString() as Algorithm,
      issuer: env.get('VONAGE_JWT_ISSUER').required().default('Vonage').asString()
    }
  };
}

export function readMailgunConfig(env: Environment): MailgunEndpointConfig {
  return {
    mailgunConfig: {
      apiKey: env.get('MAILGUN_API_KEY').required().asString(),
      baseUrl: env.get('MAILGUN_BASE_URL').required().asString() as Url,
      domainName: env.get('MAILGUN_DOMAIN_NAME').required().asString()
    }
  };
}

export function readEmailingConfig(env: Environment): EmailingEndpointConfig {
  return {
    emailingConfig: {
      enabled: env.get('EMAILING_ENABLED').required().default('true').asBool()
    }
  };
}

export function readEmailingSenderConfig(env: Environment): EmailingSenderEndpointConfig {
  return {
    emailingSenderConfig: {
      sender: {
        name: env.get('EMAILING_SENDER_DISPLAY_NAME').required().asString(),
        email: env.get('EMAILING_SENDER_EMAIL').required().asString() as Email
      }
    }
  };
}

export function readEmailingTopicConfig(env: Environment): EmailingTopicConfig {
  return {
    emailingTopicConfig: {
      topicArn: env.get('EMAILING_TOPIC_ARN').required().asString() as AwsArn
    }
  };
}

export function readEmailToBeSentTopicConfig(env: Environment): EmailToBeSentTopicConfig {
  return {
    emailToBeSentTopicConfig: {
      topicArn: env.get('EMAIL_TO_BE_SENT_TOPIC_ARN').required().asString() as AwsArn
    }
  };
}

export function readPaymentWebhookTopicConfig(env: Environment): PaymentWebhookTopicConfig {
  return {
    paymentWebhookTopicConfig: {
      topicArn: env.get('PAYMENT_WEBHOOK_TOPIC_ARN').required().asString() as AwsArn
    }
  };
}

export function readAlertThresholdConfig(env: Environment): AlertEndpointConfig {
  return {
    alertThresholdConfig: {
      errorRateThreshold: env.get('ERROR_RATE_THRESHOLD').default(5).asIntPositive(),
      maxNotificationsPerDay: env.get('MAX_NOTIFICATIONS_PER_DAY').default(1).asIntPositive(),
      countThresholdToEnableTrigger: env
        .get('COUNT_THRESHOLD_TO_ENABLE_TRIGGER')
        .default(0)
        .asIntPositive()
    },
    alertEmailConfig: {
      faqUrl: env.get('FAQ_URL').default('https://notifycal.com/faq').asUrlObject()
    }
  };
}

export function readPaymentPlans(env: Environment): PaymentPlansEndpointConfig {
  return {
    paymentPlans: {
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
      }
    }
  };
}