import jwtBuilder, { type SignOptions } from 'jsonwebtoken';
import type { Jwt, UserId } from '@own-types/model';
import type {
  DecodeAccessJwtConfig,
  EncodeAccessJwtConfig,
  EncodeRefreshJwtConfig
} from '@model/Config';
import { v4 as uuidv4 } from 'uuid';
import type { z } from 'zod';
import {
  type AccessToken,
  type OurAccessTokenClaims,
  type OurRefreshTokenClaims,
  type RefreshToken,
  accessTokenSchema,
  refreshTokenSchema
} from '@model/Jwt';
import { rejectWithErrorMessage } from './common/error-handling';
import type { Identity } from '@model/Identity';

export function accessJwtPayload(identity: Identity): OurAccessTokenClaims {
  return {
    ...identity,
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
      return Promise.reject(new Error(msg));
    }
  } catch (error: unknown) {
    return rejectWithErrorMessage('JWT decoding failed', error);
  }
}

export function buildJwt<T extends z.ZodTypeAny>(
  payload: OurAccessTokenClaims | OurRefreshTokenClaims,
  jwtSchema: T,
  subject: UserId,
  config: EncodeAccessJwtConfig
): Promise<EncodedAndDecodedJwt<z.infer<T>>> {
  try {
    const encoded = jwtBuilder.sign(payload, config.privateKey, {
      jwtid: uuidv4(),
      algorithm: config.algorithm,
      issuer: config.issuer,
      audience: config.audience,
      subject: subject,
      expiresIn: config.expiresIn
    } as SignOptions) as Jwt;
    return decodeJwt(encoded, jwtSchema).then((decoded) => ({
      encoded: encoded,
      decoded: decoded
    }));
  } catch (error: unknown) {
    return rejectWithErrorMessage('JWT could not be generated', error);
  }
}

export function buildJwts(
  identity: Identity,
  encodeJwtConfig: EncodeAccessJwtConfig,
  encodeRefreshJwtConfig: EncodeRefreshJwtConfig
): Promise<EncodedAndDecodedJwts> {
  function prependJwtType(type: string): (error: Error) => Promise<EncodedAndDecodedJwt<never>> {
    return (error: Error) => Promise.reject(new Error(`${type} ${error.message}`));
  }

  return Promise.all([
    buildJwt(accessJwtPayload(identity), accessTokenSchema, identity.userId, encodeJwtConfig).catch(
      prependJwtType('Access')
    ),
    buildJwt({}, refreshTokenSchema, identity.userId, encodeRefreshJwtConfig).catch(
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
  } catch (error: unknown) {
    return rejectWithErrorMessage('JWT verification failed', error);
  }
}
