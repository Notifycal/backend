import type { Algorithm, DecodeAccessJwtEndpointConfig } from '@model/Config';
import type { Url } from '@own-types/model';
import type {
  VonageApiKey,
  VonageApplicationId,
  VonageJwtSigningSecret,
  VonagePrivateKey
} from '@services/messaging/vonage';
import type { z } from 'zod';
import type { vonageAccessTokenSchema } from './schemas';

export interface VonageConfig {
  privateKeySSMPath: string;
  applicationId: VonageApplicationId;
  webhookBaseURL: Url;
}

export interface VonageEndpointConfig {
  vonageConfig: VonageConfig & { privateKey: VonagePrivateKey };
}

export interface DecodeVonageAccessJwtConfig {
  applicationId: VonageApplicationId;
  apiKey: VonageApiKey;
  signingSecret: VonageJwtSigningSecret;
  algorithm: Algorithm;
  issuer: string;
}

export type DecodeVonageAccessJwtEndpointConfig =
  DecodeAccessJwtEndpointConfig<DecodeVonageAccessJwtConfig>;

export type VonageAccessToken = z.infer<typeof vonageAccessTokenSchema>;
