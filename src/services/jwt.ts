import jwtBuilder, { SignOptions } from 'jsonwebtoken';
import { EncodeJwtConfig } from '@lambdas/api/post-login/config';
import { Jwt } from '@own-types/model';
import { Jwt as StructuredJwt } from 'jsonwebtoken';
import { DecodeJwtConfig } from '@model/Config';

export function buildJwt(payload: object, subject: string, config: EncodeJwtConfig): Promise<Jwt> {
  try {
    return Promise.resolve(
      jwtBuilder.sign(payload, config.privateKey, {
        algorithm: config.algorithm,
        issuer: config.issuer,
        audience: config.audience,
        subject: subject,
        expiresIn: config.expiresIn
      } as SignOptions)
    );
  } catch (error) {
    const msg = `JWT could not be generated. Error: ${error}`;
    return Promise.reject(msg);
  }
}

export function decodeAndVerifyJwtSignature(
  jwt: Jwt,
  config: DecodeJwtConfig
): Promise<StructuredJwt> {
  try {
    return Promise.resolve(
      jwtBuilder.verify(jwt, config.publicKey, {
        complete: true,
        issuer: config.issuer,
        audience: config.audience,
        maxAge: config.expiresIn
      })
    );
  } catch (error) {
    const msg = `JWT verification failed. Error: ${error}`;
    return Promise.reject(msg);
  }
}
