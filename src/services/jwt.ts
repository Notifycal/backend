import jwtBuilder, { SignOptions } from 'jsonwebtoken';
import { Jwt, UserId } from '@own-types/model';
import { DecodeJwtConfig, EncodeJwtConfig, EncodeRefreshJwtConfig } from '@model/Config';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { OurAccessTokenClaims, OurRefreshTokenClaims } from '@model/Jwt';

export function buildJwts(
  userId: UserId,
  encodeJwtConfig: EncodeJwtConfig,
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig
): Promise<EncodedJwts> {
  return Promise.all([
    buildJwt(jwtPayload(userId), userId, encodeJwtConfig),
    buildJwt({}, userId, encodeRefreshJwtConfig)
  ]).then(([accessToken, refreshToken]) => ({
    accessToken,
    refreshToken
  }));
}

export function decodeAndVerifyJwtSignature<JwtType>(
  jwt: Jwt,
  config: DecodeJwtConfig
): Promise<JwtType> {
  try {
    const token = jwtBuilder.verify(jwt, config.publicKey, {
      complete: true,
      issuer: config.issuer,
      audience: config.audience,
      maxAge: config.expiresIn
    });
    const schema = z.custom<JwtType>();
    return Promise.resolve(schema.parse(token));
  } catch (error) {
    const msg = `JWT verification failed. Error: ${error}`;
    return Promise.reject(msg);
  }
}

export function decodeJwt<JwtType>(jwt: Jwt): Promise<JwtType> {
  try {
    const token = jwtBuilder.decode(jwt, {
      complete: true
    });
    if (token) {
      const schema = z.custom<JwtType>();
      console.log(JSON.stringify(schema._def.toString()));
      return Promise.resolve(schema.parse(token));
    } else {
      const msg = `JWT decoding failed. Operation resulted in null`;
      return Promise.reject(msg);
    }
  } catch (error) {
    const msg = `JWT decoding failed. Error: ${error}`;
    return Promise.reject(msg);
  }
}

export function buildJwt(
  payload: OurAccessTokenClaims | OurRefreshTokenClaims,
  subject: string,
  config: EncodeJwtConfig
): Promise<Jwt> {
  try {
    return Promise.resolve(
      jwtBuilder.sign(payload, config.privateKey, {
        jwtid: uuidv4(),
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

export function jwtPayload(userId: UserId): OurAccessTokenClaims {
  return {
    email: userId,
    role: 'user',
    permissions: {}
  };
}

export interface EncodedJwts {
  accessToken: Jwt;
  refreshToken: Jwt;
}
