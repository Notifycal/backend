export interface AuthedEndpointConfig {
  decodeJwtConfig: DecodeJwtConfig;
}

export interface DecodeJwtConfig {
  publicKey: string;
  issuer: string;
  audience: string;
  expiresIn: string;
}
