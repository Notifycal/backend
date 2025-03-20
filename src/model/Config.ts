import type { DynamoDBPersistenceOptions } from '@aws-lambda-powertools/idempotency/dynamodb/types';
import type { IdpName } from '@notifycal/shared/types';
import type { AwsArn, PrivateKey, PublicKey, SigningSecret, Url } from '@own-types/model';
import type {
  Algorithm as jsonwebtokenAlgorithm,
  SignOptions as jsonwebtokenSignOptions
} from 'jsonwebtoken';

export type SignOptions = jsonwebtokenSignOptions;
export type Algorithm = jsonwebtokenAlgorithm;
export type Duration = SignOptions['expiresIn'];

export interface CommonJwtConfig {
  issuer: string;
  audience: string;
  expiresIn: Duration;
}

export interface DecodeAccessJwtConfig extends CommonJwtConfig {
  secretOrPublicKey: PublicKey | SigningSecret;
}

export type DecodeRefreshJwtConfig = DecodeAccessJwtConfig;

export interface CorsConfig {
  frontendDomain: string;
}
export interface CorsEndpointConfig {
  corsConfig: CorsConfig;
}

export interface DecodeAccessJwtEndpointConfig<TDecodeAccessJwtConfig = DecodeAccessJwtConfig> {
  decodeAccessJwtConfig: TDecodeAccessJwtConfig;
}

export type OptionalCorsEndpointConfig =
  | CorsEndpointConfig
  | Omit<CorsEndpointConfig, 'corsConfig'>;

export type AuthedEndpointConfig<
  TPotentialCorsEndpointConfig = CorsEndpointConfig,
  TDecodeAccessJwtConfig = DecodeAccessJwtConfig
> = DecodeAccessJwtEndpointConfig<TDecodeAccessJwtConfig> & TPotentialCorsEndpointConfig;

export interface EncodeAccessJwtConfig extends CommonJwtConfig {
  secretOrPrivateKey: PrivateKey | SigningSecret;
  algorithm: Algorithm;
}
export type EncodeRefreshJwtConfig = EncodeAccessJwtConfig;

export interface EncodeJwtsEndpointConfig {
  encodeAccessJwtConfig: EncodeAccessJwtConfig;
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}
export type IdpConfigMap = {
  'google.com': GoogleOAuthConfig;
};

export type IdpConfig<TIdp extends IdpName> = IdpConfigMap[TIdp];

export type IdpConfigs = {
  [TIdp in IdpName]: IdpConfig<TIdp>;
};

export interface IdpEndpointConfig {
  idpConfigs: IdpConfigs;
}

export interface SnsTopicConfig {
  topicArn: AwsArn;
}

export interface SqsQueueConfig {
  queueUrl: Url;
}

export type UserCalendarFetchedTopicConfig = {
  userCalendarFetchedTopicConfig: SnsTopicConfig;
};

export type ActionableEventFoundTopicConfig = {
  actionableEventFoundTopicConfig: SnsTopicConfig;
};

export type DeadLetterQueueConfig = {
  deadLetterQueueConfig: SqsQueueConfig;
};

export type AuditTrailQueueConfig = {
  auditTrailQueueConfig: SqsQueueConfig;
};

export type IdempotencyPersistenceConfig = {
  idempotencyPersistenceConfig: DynamoDBPersistenceOptions;
};
