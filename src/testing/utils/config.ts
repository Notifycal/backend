import type { StripeCustomerPortalConfig } from '@lambdas/api/post-customer-portal-session/config';
import type {
  StripeAuthConfig,
  StripeCheckoutConfig
} from '@lambdas/api/post-payment-session/config';
import type {
  AlertEmailConfig,
  AlertThresholdConfig
} from '@lambdas/dynamodb-streams/alert-for-missing-phone-number/config';
import type {
  CorsConfig,
  CreditServiceEndpointConfig,
  CronRunConfig,
  DecodeAccessJwtConfig,
  DecodeRefreshJwtConfig,
  EmailingConfig,
  EmailingSenderConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig,
  IdempotencyPersistenceConfig,
  IdpConfigs,
  PaymentPlansConfig,
  SnsTopicConfig,
  SqsQueueConfig
} from '@model/Config';
import type { MailgunConfig } from '@model/vendor/mailgun/config';
import type { VonageConfig } from '@model/vendor/vonage/config';
import type { AlertsBaseStoreConfig } from '@services/stores/alerts-base-store';
import type { AuditTrailBaseStoreConfig } from '@services/stores/audit-trail-base-store';
import type { PaymentUserIndexStoreConfig } from '@services/stores/payment-user-index-store';
import type { RefreshTokenBaseStoreConfig } from '@services/stores/refresh-token-base-store';
import type { UserBaseStoreConfig } from '@services/stores/user-base-store';
import type { UserLiveIndexStoreConfig } from '@services/stores/user-live-index-store';
import { match } from 'ts-pattern';

export const fakeIdpConfigs: IdpConfigs = {
  'google.com': {
    clientId: 'some_valid_google_app_url',
    clientSecret: 'some_valid_secret',
    redirectUriList: ['http://localhost:5173']
  }
};

function setEnvVar(envVar: string | undefined, value: string | undefined): void {
  if (value) {
    envVar = value;
  }
}

export function setEnvEncodeAccessJwtConfig(config: EncodeAccessJwtConfig): void {
  process.env.ACCESS_JWT_PRIVATE_KEY = config.secretOrPrivateKey;
  process.env.ACCESS_JWT_ALGORITHM = config.algorithm;
  process.env.ACCESS_JWT_ISSUER = config.issuer;
  process.env.ACCESS_JWT_AUDIENCE = config.audience;
  setEnvVar(process.env.ACCESS_JWT_EXPIRATION, config.expiresIn?.toString());
}

export function setEnvEncodeRefreshJwtConfig(config: EncodeRefreshJwtConfig): void {
  process.env.REFRESH_JWT_PRIVATE_KEY = config.secretOrPrivateKey;
  process.env.REFRESH_JWT_ALGORITHM = config.algorithm;
  process.env.REFRESH_JWT_ISSUER = config.issuer;
  process.env.REFRESH_JWT_AUDIENCE = config.audience;
  setEnvVar(process.env.REFRESH_JWT_EXPIRATION, config.expiresIn?.toString());
}

export function setEnvDecodeAccessJwtConfig(config: DecodeAccessJwtConfig): void {
  process.env.ACCESS_JWT_PUBLIC_KEY = config.secretOrPublicKey;
  process.env.ACCESS_JWT_AUDIENCE = config.audience;
  process.env.ACCESS_JWT_ISSUER = config.issuer;
  setEnvVar(process.env.ACCESS_JWT_EXPIRATION, config.expiresIn?.toString());
}

export function setEnvDecodeRefreshJwtConfig(config: DecodeRefreshJwtConfig): void {
  process.env.REFRESH_JWT_PUBLIC_KEY = config.secretOrPublicKey;
  process.env.REFRESH_JWT_AUDIENCE = config.audience;
  process.env.REFRESH_JWT_ISSUER = config.issuer;
  setEnvVar(process.env.REFRESH_JWT_EXPIRATION, config.expiresIn?.toString());
}

export function setEnvUserBaseStoreConfig(config: UserBaseStoreConfig): void {
  process.env.USERS_TABLE_NAME = config.tableName;
}

export function setEnvUserLiveStoreConfig(config: UserLiveIndexStoreConfig): void {
  process.env.USERS_TABLE_NAME = config.tableName;
  process.env.LIVE_USERS_INDEX_NAME = config.indexName;
  process.env.USERS_PAGE_SIZE = config.pageSize.toString();
}

export function setEnvPaymentUserStoreConfig(config: PaymentUserIndexStoreConfig): void {
  process.env.USERS_TABLE_NAME = config.tableName;
  process.env.PAYMENT_USERS_INDEX_NAME = config.indexName;
  process.env.PAYMENT_USERS_PAGE_SIZE = config.pageSize.toString();
}

export function setEnvUserCalendarFetchedTopicConfig(config: SnsTopicConfig): void {
  process.env.USER_CALENDAR_FETCHED_TOPIC_ARN = config.topicArn;
}

export function setEnvActionableEventFoundTopicConfig(config: SnsTopicConfig): void {
  process.env.ACTIONABLE_EVENT_FOUND_TOPIC_ARN = config.topicArn;
}

export function setEnvMessagingTopicConfig(config: SnsTopicConfig): void {
  process.env.MESSAGING_TOPIC_ARN = config.topicArn;
}

export function setEnvEmailingTopicConfig(config: SnsTopicConfig): void {
  process.env.EMAILING_TOPIC_ARN = config.topicArn;
}

export function setEnvEmailToBeSentTopicConfig(config: SnsTopicConfig): void {
  process.env.EMAIL_TO_BE_SENT_TOPIC_ARN = config.topicArn;
}

export function setEnvApiRestTopicConfig(config: SnsTopicConfig): void {
  process.env.API_REST_TOPIC_ARN = config.topicArn;
}

export function setEnvDemoReminderToBeSentTopicConfig(config: SnsTopicConfig): void {
  process.env.DEMO_REMINDER_TO_BE_SENT_TOPIC_ARN = config.topicArn;
}

export function setEnvPaymentWebhookTopicConfig(config: SnsTopicConfig): void {
  process.env.PAYMENT_WEBHOOK_TOPIC_ARN = config.topicArn;
}

export function setEnvDeadLetterQueueConfig(config: SqsQueueConfig): void {
  process.env.DEAD_LETTER_QUEUE_URL = config.queueUrl;
}

export function setEnvCronRunConfig(config: CronRunConfig): void {
  process.env.RUN_TIME_WINDOW_PERIOD_MINUTES = config.windowInMinutes.toString();
}

export function setEnvRefreshTokenBaseStoreConfig(config: RefreshTokenBaseStoreConfig): void {
  process.env.REFRESH_TOKENS_TABLE_NAME = config.tableName;
}

export function setEnvAuditTrailBaseStoreConfig(config: AuditTrailBaseStoreConfig): void {
  process.env.AUDIT_TRAIL_TABLE_NAME = config.tableName;
}

export function setEnvAlertsBaseStoreConfig(config: AlertsBaseStoreConfig): void {
  process.env.BUSINESS_ALERTS_TABLE_NAME = config.tableName;
}

export function setEnvEmailingConfig(config: EmailingConfig): void {
  process.env.EMAILING_ENABLED = config.enabled.toString();
}

export function setEnvEmailingSenderConfig(config: EmailingSenderConfig): void {
  process.env.EMAILING_SENDER_DISPLAY_NAME = config.sender.name;
  process.env.EMAILING_SENDER_EMAIL = config.sender.email;
}

export function setEnvBaseConfig(config: CorsConfig): void {
  process.env.ALLOWED_ORIGINS = JSON.stringify(config.allowedOrigins);
}

export function setEnvIdpConfigs(configs: IdpConfigs): void {
  Object.keys(configs).forEach((idp) => {
    match(idp)
      .with('google.com', (idp) => {
        process.env.GOOGLE_OAUTH_CLIENT_ID = configs[idp].clientId;
        process.env.GOOGLE_OAUTH_CLIENT_SECRET = configs[idp].clientSecret;
        process.env.GOOGLE_OAUTH_CLIENT_REDIRECT_URI_LIST = JSON.stringify(
          configs[idp].redirectUriList
        );
      })
      .otherwise((v) => {
        throw new Error(`Environment could not be set for all Idps. Missing idp: ${v}`);
      });
  });
}

export function setEnvIdempotencyPersistanceConfig(config: IdempotencyPersistenceConfig): void {
  process.env.IDEMPOTENCY_PERSISTENCE_CONFIG = JSON.stringify(config.idempotencyPersistenceConfig);
}

export function setEnvVonageConfig(config: VonageConfig): void {
  process.env.VONAGE_SSM_PATH_PRIVATE_KEY = config.privateKeySSMPath;
  process.env.VONAGE_APPLICATION_ID = config.applicationId;
  process.env.VONAGE_WEBHOOK_BASE_URL = config.webhookBaseURL;
}

export function setEnvMaigunConfig(config: MailgunConfig): void {
  process.env.MAILGUN_API_KEY = config.apiKey;
  process.env.MAILGUN_BASE_URL = config.baseUrl;
  process.env.MAILGUN_DOMAIN_NAME = config.domainName;
}

export function setEnvAlertThresholdConfig(config: AlertThresholdConfig): void {
  process.env.ERROR_RATE_THRESHOLD = config.errorRateThreshold.toString();
  process.env.MAX_NOTIFICATIONS_PER_DAY = config.maxNotificationsPerDay.toString();
  process.env.COUNT_THRESHOLD_TO_ENABLE_TRIGGER = config.countThresholdToEnableTrigger.toString();
}

export function setEnvAlertEmailConfig(config: AlertEmailConfig): void {
  process.env.FAQ_URL = config.faqUrl.toString();
}

export function setEnvStripeAuthConfig(config: StripeAuthConfig): void {
  process.env.STRIPE_API_KEY = config.apiKey;
}

export function setEnvCustomerPortalConfig(config: StripeCustomerPortalConfig): void {
  process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL_PATH = config.returnUrlPath;
}

export function setEnvStripeCheckoutConfig(config: StripeCheckoutConfig): void {
  process.env.STRIPE_SUCCESS_REDIRECT_URL_PATH = config.successRedirectUrlPath;
  process.env.STRIPE_CANCEL_REDIRECT_URL_PATH = config.cancelRedirectUrlPath;
  process.env.STRIPE_TAX_ID = config.taxId;
}

export function setEnvPaymentPlansConfig(config: PaymentPlansConfig): void {
  process.env.PAYMENT_PLANS = JSON.stringify(config);
}

export function setEnvCreditServiceConfig(config: CreditServiceEndpointConfig): void {
  process.env.COUNTRY_CODE_TO_SMS_COST_MAP = JSON.stringify(config.countryToSMSCostCreditsMap);
}
