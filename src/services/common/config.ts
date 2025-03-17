import type {
  ActionableEventFoundTopicConfig,
  AuthedEndpointConfig,
  BaseEndpointConfig,
  CronRunEndpointConfig,
  DeadLetterQueueConfig,
  DecodeAccessJwtConfig,
  DecodeAccessJwtEndpointConfig,
  DecodeRefreshJwtConfig,
  EncodeAccessJwtConfig,
  EncodeJwtsEndpointConfig,
  EncodeRefreshJwtConfig,
  IdpEndpointConfig,
  UserCalendarFetchedTopicConfig
} from '@model/Config';
import type { AwsArn, Environment, Url } from '@own-types/model';
import type { AuditTrailBaseStoreEndpointConfig } from '@services/stores/audit-trail-base-store';
import type { RefreshTokenBaseStoreConfigEndpointConfig } from '@services/stores/refresh-token-base-store';
import type { UserBaseStoreEndpointConfig } from '@services/stores/user-base-store';
import type { UserLiveIndexStoreEndpointConfig } from '@services/stores/user-live-index-store';
import { from } from 'env-var';

export function readEnv(): Environment {
  return from(process.env, {});
}

const readJwtConfig = (
  env: Environment,
  prefix: 'ACCESS' | 'REFRESH',
  expiresInDefault: string
): Omit<EncodeAccessJwtConfig, 'privateKey'> => ({
  algorithm: env.get(`${prefix}_JWT_ALGORITHM`).required().default('RS256').asString(),
  issuer: env.get(`${prefix}_JWT_ISSUER`).required().default('notifycal.com').asString(),
  audience: env.get(`${prefix}_JWT_AUDIENCE`).required().default('notifycal.com').asString(),
  expiresIn: env.get(`${prefix}_JWT_EXPIRATION`).required().default(expiresInDefault).asString()
});

export function readBaseConfig(env: Environment): BaseEndpointConfig {
  return {
    baseConfig: {
      frontendDomain: env.get(`FRONTEND_DOMAIN`).required().asString()
    }
  };
}

function readEncodeAccessJwtConfig(env: Environment): EncodeAccessJwtConfig {
  return {
    privateKey: env.get(`ACCESS_JWT_PRIVATE_KEY`).required().asString(),
    ...readJwtConfig(env, 'ACCESS', '5m')
  };
}

function readEncodeRefreshJwtConfig(env: Environment): EncodeRefreshJwtConfig {
  return {
    privateKey: env.get(`REFRESH_JWT_PRIVATE_KEY`).required().asString(),
    ...readJwtConfig(env, 'REFRESH', '7d')
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
    publicKey: env.get('ACCESS_JWT_PUBLIC_KEY').required().asString(),
    ...readJwtConfig(env, 'ACCESS', '5m')
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
    publicKey: env.get('REFRESH_JWT_PUBLIC_KEY').required().asString(),
    ...readJwtConfig(env, 'REFRESH', '7d')
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

export function readDeadLetterQueueConfig(env: Environment): DeadLetterQueueConfig {
  return {
    deadLetterQueueConfig: {
      queueUrl: env.get('DEAD_LETTER_QUEUE_URL').required().asString() as Url
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
        redirectUri: env.get('GOOGLE_OAUTH_CLIENT_REDIRECT_URI').required().asString()
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
