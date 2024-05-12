import { from } from 'env-var';

export interface LoginConfig {
  privateKey: string;
  jwt: JwtConfig;
  googleClientId: string;
}

export interface JwtConfig {
  algorithm: string;
  issuer: string;
  expiresIn: string;
}

export function readLoginConfig(): LoginConfig {
  const env = from(process.env, {});
  return {
    privateKey: env.get('JWT_PRIVATE_KEY').required().asString(),
    jwt: {
      algorithm: env.get('JWT_ALGORITHM').required().default('RS256').asString(),
      issuer: env.get('JWT_ISSUER').required().default('notifycal.com').asString(),
      expiresIn: env.get('JWT_EXPIRATION').required().default('5m').asString()
    },
    googleClientId: env.get('GOOGLE_CLIENT_ID').required().asString()
  }
}
