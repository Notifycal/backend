import jwtBuilder, { SignOptions } from 'jsonwebtoken';
import { JwtConfig } from "lambdas/api/login/config";
import { User } from 'model/User';
import { Jwt } from 'types/model';

export function buildJwt(user: User, privateKey: string, config: JwtConfig): Promise<Jwt> {
  const tokenPayload = {
    email: user.UserId,
    role: 'user',
    permissions: {}
  };
  try { 
    return Promise.resolve(jwtBuilder.sign(tokenPayload, privateKey, {
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