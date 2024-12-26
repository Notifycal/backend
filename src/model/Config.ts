export interface AuthedEndpointConfig {
  decodeJwtConfig: DecodeJwtConfig;
}

export interface DecodeJwtConfig {
  publicKey: string;
  issuer: string;
  audience: string;
  expiresIn: string;
}
export type DecodeRefreshJwtConfig = DecodeJwtConfig;

export interface EncodeJwtConfig {
  privateKey: string;
  algorithm: string;
  issuer: string;
  audience: string;
  expiresIn: string;
}
export type EncodeRefreshJwtConfig = EncodeJwtConfig;

export interface AwsConfig {
  awsRegion?: string;
  endpoint?: string;
  credentials?: { accessKeyId: string; secretAccessKey: string };
}

export const defaultConfig = {
  awsRegion: 'eu-west-1'
};
