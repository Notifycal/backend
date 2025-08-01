import type { DecodeAccessJwtConfig, SignOptions } from '@model/Config';
import {
  accessTokenSchema,
  refreshTokenSchema,
  type AccessToken,
  type OurAccessTokenClaims,
  type OurRefreshTokenClaims,
  type RefreshToken
} from '@model/Jwt';
import type { DecodeVonageAccessJwtConfig } from '@model/vendor/vonage/config';
import type { IdpName, Jwt, UserId, UserIdentity } from '@notifycal/shared/types';
import jwtBuilder from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { z } from 'zod';
import { rejectWithMessageAndError } from './common/error-handling';

export function accessJwtPayload<TIdpName extends IdpName>(
  userIdentity: UserIdentity<TIdpName>
): OurAccessTokenClaims {
  return {
    ...userIdentity,
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
    return rejectWithMessageAndError('JWT decoding failed', error);
  }
}

export function buildJwt<
  T extends z.ZodTypeAny,
  TConfig extends SignOptions & { secretOrPrivateKey: string }
>(
  payload: OurAccessTokenClaims | OurRefreshTokenClaims,
  jwtSchema: T,
  subject: UserId,
  config: TConfig
): Promise<EncodedAndDecodedJwt<z.infer<T>>> {
  try {
    const encoded = jwtBuilder.sign(payload, config.secretOrPrivateKey, {
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
    return rejectWithMessageAndError('JWT could not be generated', error);
  }
}

export function buildJwts<
  TIdpName extends IdpName,
  TConfig extends SignOptions & { secretOrPrivateKey: string }
>(
  userIdentity: UserIdentity<TIdpName>,
  encodeJwtConfig: TConfig,
  encodeRefreshJwtConfig: TConfig
): Promise<EncodedAndDecodedJwts> {
  function prependJwtType(type: string): (error: Error) => Promise<EncodedAndDecodedJwt<never>> {
    return (error: Error) =>
      Promise.reject(new Error(`${type} ${error.message}`, { cause: error }));
  }

  return Promise.all([
    buildJwt(
      accessJwtPayload(userIdentity),
      accessTokenSchema,
      userIdentity.userId,
      encodeJwtConfig
    ).catch(prependJwtType('Access')),
    buildJwt({}, refreshTokenSchema, userIdentity.userId, encodeRefreshJwtConfig).catch(
      prependJwtType('Refresh')
    )
  ]).then((jwts) => ({
    accessToken: jwts[0],
    refreshToken: jwts[1]
  }));
}

export function decodeAndVerifyJwtSignature<
  T extends z.ZodObject,
  TConfig extends DecodeAccessJwtConfig = DecodeAccessJwtConfig
>(jwt: Jwt, schema: T, config: TConfig): Promise<z.infer<T>> {
  try {
    const token = jwtBuilder.verify(jwt, config.secretOrPublicKey, {
      complete: true,
      issuer: config.issuer,
      audience: config.audience,
      maxAge: config.expiresIn
    });
    return Promise.resolve(schema.parse(token));
  } catch (error: unknown) {
    return rejectWithMessageAndError('JWT verification failed', error);
  }
}

export function vonageDecodeAndVerifyJwtSignature<
  T extends z.ZodObject,
  TConfig extends DecodeVonageAccessJwtConfig = DecodeVonageAccessJwtConfig
>(jwt: Jwt, schema: T, config: TConfig): Promise<z.infer<T>> {
  try {
    const token = jwtBuilder.verify(jwt, config.signingSecret, {
      complete: true,
      issuer: config.issuer
    });
    return Promise.resolve(schema.parse(token));
  } catch (error: unknown) {
    return rejectWithMessageAndError('JWT verification failed', error);
  }
}
