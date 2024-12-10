import jwt, { SignOptions } from 'jsonwebtoken';
import { JwtConfig } from "lambdas/api/login/config";

export function buildJwt(user: User, privateKey: string, config: JwtConfig): Promise<jwt> {
  const tokenPayload = {
    email: user.email,
    role: 'user',
    permissions: {}
  };
  try { 
    return Promise.resolve(jwt.sign(tokenPayload, privateKey, {
      algorithm: config.algorithm,
      issuer: config.issuer,
      expiresIn: config.expiresIn
    } as SignOptions));
  }
  catch(error) {
    const msg = `JWT could not be generated. Error: ${error}`;
    return Promise.reject(msg);
  }
}