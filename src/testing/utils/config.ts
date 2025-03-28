import type {
  CorsConfig,
  CronRunConfig,
  DecodeAccessJwtConfig,
  DecodeRefreshJwtConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig,
  IdempotencyPersistenceConfig,
  IdpConfigs,
  SnsTopicConfig,
  SqsQueueConfig
} from '@model/Config';
import type { VonageConfig } from '@model/vendor/vonage';
import type { AuditTrailBaseStoreConfig } from '@services/stores/audit-trail-base-store';
import type { RefreshTokenBaseStoreConfig } from '@services/stores/refresh-token-base-store';
import type { UserBaseStoreConfig } from '@services/stores/user-base-store';
import type { UserLiveIndexStoreConfig } from '@services/stores/user-live-index-store';
import { match } from 'ts-pattern';

export const fakeIdpConfigs: IdpConfigs = {
  'google.com': {
    clientId: 'some_valid_google_app_url',
    clientSecret: 'some_valid_secret',
    redirectUri: 'http://localhost:5173'
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

export function setEnvUserCalendarFetchedTopicConfig(config: SnsTopicConfig): void {
  process.env.USER_CALENDAR_FETCHED_TOPIC_ARN = config.topicArn;
}

export function setEnvActionableEventFoundTopicConfig(config: SnsTopicConfig): void {
  process.env.ACTIONABLE_EVENT_FOUND_TOPIC_ARN = config.topicArn;
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

export function setEnvAuditTrailQueueConfig(config: SqsQueueConfig): void {
  process.env.AUDIT_TRAIL_QUEUE_URL = config.queueUrl;
}

export function setEnvBaseConfig(config: CorsConfig): void {
  process.env.FRONTEND_DOMAIN = config.frontendDomain;
}

export function setEnvIdpConfigs(configs: IdpConfigs): void {
  Object.keys(configs).forEach((idp) => {
    match(idp)
      .with('google.com', (idp) => {
        process.env.GOOGLE_OAUTH_CLIENT_ID = configs[idp].clientId;
        process.env.GOOGLE_OAUTH_CLIENT_SECRET = configs[idp].clientSecret;
        process.env.GOOGLE_OAUTH_CLIENT_REDIRECT_URI = configs[idp].redirectUri;
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