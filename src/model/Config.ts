export interface AuthedEndpointConfig {
  decodeJwtConfig: DecodeJwtConfig;
}

export interface DecodeJwtConfig {
  publicKey: string;
  issuer: string;
  audience: string;
  expiresIn: string;
}

export interface AwsConfig {
  awsRegion?: string;
  endpoint?: string;
  credentials?: { accessKeyId: string; secretAccessKey: string };
}

export const defaultConfig = {
  awsRegion: 'eu-west-1'
};
