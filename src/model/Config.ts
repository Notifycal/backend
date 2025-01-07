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

export interface AuthedEndpointConfig extends BaseEndpointConfig {
  decodeAccessJwtConfig: DecodeAccessJwtConfig;
}

export interface EncodeAccessJwtConfig {
  privateKey: string;
  algorithm: string;
  issuer: string;
  audience: string;
  expiresIn: string;
}
export type EncodeRefreshJwtConfig = EncodeAccessJwtConfig;
