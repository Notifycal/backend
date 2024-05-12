import jwt, { SignOptions } from 'jsonwebtoken';
import { JwtConfig } from "lambdas/api/login/config";

export function buildJwt(user: User, privateKey: string, config: JwtConfig): jwt {
  const tokenPayload = {
    email: user.email,
    role: 'user',
    permissions: {}
  };
  return jwt.sign(tokenPayload, privateKey, {
    algorithm: config.algorithm,
    issuer: config.issuer,
    expiresIn: config.expiresIn
  } as SignOptions);
}