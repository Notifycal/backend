import type { IdpName } from '@notifycal/shared/types';
import type { AwsArn, Url } from '@own-types/model';

export interface DecodeAccessJwtConfig {
  publicKey: string;
  issuer: string;
  audience: string;
  expiresIn: string;
}

export type DecodeRefreshJwtConfig = DecodeAccessJwtConfig;

export interface BaseConfig {
  frontendDomain: string;
}
export interface BaseEndpointConfig {
  baseConfig: BaseConfig;
}

export interface DecodeAccessJwtEndpointConfig {
  decodeAccessJwtConfig: DecodeAccessJwtConfig;
}

export type AuthedEndpointConfig = BaseEndpointConfig & DecodeAccessJwtEndpointConfig;

export interface EncodeAccessJwtConfig {
  privateKey: string;
  algorithm: string;
  issuer: string;
  audience: string;
  expiresIn: string;
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

export interface CronRunConfig {
  windowInMinutes: number;
}
export interface CronRunEndpointConfig {
  cronRunConfig: CronRunConfig;
}
