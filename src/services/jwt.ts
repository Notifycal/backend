import jwtBuilder, { SignOptions } from 'jsonwebtoken';
import { Jwt, UserId } from '@own-types/model';
import {
  DecodeAccessJwtConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  AccessToken,
  OurAccessTokenClaims,
  OurRefreshTokenClaims,
  RefreshToken,
  accessTokenSchema,
  refreshTokenSchema
} from '@model/Jwt';

export function buildJwts(
  userId: UserId,
  encodeJwtConfig: EncodeAccessJwtConfig,
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig
): Promise<EncodedAndDecodedJwts> {
  function prependJwtType(type: string): (error: string) => Promise<EncodedAndDecodedJwt<never>> {
    return (error: string) => Promise.reject(`${type} ${error}`);
  }

  return Promise.all([
    buildJwt(accessJwtPayload(userId), accessTokenSchema, userId, encodeJwtConfig).catch(
      prependJwtType('Access')
    ),
    buildJwt({}, refreshTokenSchema, userId, encodeRefreshJwtConfig).catch(
      prependJwtType('Refresh')
    )
  ]).then((jwts) => ({
    accessToken: jwts[0],
    refreshToken: jwts[1]
  }));
}

export function decodeAndVerifyJwtSignature<T extends z.ZodTypeAny>(
  jwt: Jwt,
  schema: T,
  config: DecodeAccessJwtConfig
): Promise<z.infer<T>> {
  try {
    const token = jwtBuilder.verify(jwt, config.publicKey, {
      complete: true,
      issuer: config.issuer,
      audience: config.audience,
      maxAge: config.expiresIn
    });
    return Promise.resolve(schema.parse(token));
  } catch (error) {
    const msg = `JWT verification failed. Error: ${error}`;
    return Promise.reject(msg);
  }
}

export function decodeJwt<T extends z.ZodTypeAny>(jwt: Jwt, jwtSchema: T): Promise<z.infer<T>> {
  try {
    const token = jwtBuilder.decode(jwt, {
      complete: true
    });
    if (token) {
      // https://zod.dev/?id=inferring-the-inferred-type
      return Promise.resolve(jwtSchema.parse(token) as z.infer<T>);
    } else {
      const msg = `JWT decoding failed. Most likely, the JWT was not a proper JSON`;
      return Promise.reject(msg);
    }
  } catch (error) {
    const msg = `JWT decoding failed. Error: ${error}`;
    return Promise.reject(msg);
  }
}

export function buildJwt<T extends z.ZodTypeAny>(
  payload: OurAccessTokenClaims | OurRefreshTokenClaims,
  jwtSchema: T,
  subject: string,
  config: EncodeAccessJwtConfig | EncodeRefreshJwtConfig
): Promise<EncodedAndDecodedJwt<z.infer<T>>> {
  try {
    const encoded = jwtBuilder.sign(payload, config.privateKey, {
      jwtid: uuidv4(),
      algorithm: config.algorithm,
      issuer: config.issuer,
      audience: config.audience,
      subject: subject,
      expiresIn: config.expiresIn
    } as SignOptions);
    return decodeJwt(encoded, jwtSchema).then((decoded) => ({
      encoded: encoded,
      decoded: decoded
    }));
  } catch (error) {
    const msg = `JWT could not be generated. ${error}`;
    return Promise.reject(msg);
  }
}

export function accessJwtPayload(userId: UserId): OurAccessTokenClaims {
  return {
    email: userId,
    role: 'user',
    permissions: {}
  };
}

export interface EncodedAndDecodedJwt<JwtType> {
  encoded: Jwt;
  decoded: JwtType;
}

export interface EncodedAndDecodedJwts {
  accessToken: EncodedAndDecodedJwt<AccessToken>;
  refreshToken: EncodedAndDecodedJwt<RefreshToken>;
}
