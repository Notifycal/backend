import { UserId } from '@own-types/model';
import { Jwt, JwtHeader } from 'jsonwebtoken';

export interface AccessToken {
  header: JwtHeader;
  payload: AccessTokenPayload;
  signature: string;
}

export interface RefreshToken {
  header: JwtHeader;
  payload: RefreshTokenPayload;
  signature: string;
}

export interface OurAccessTokenClaims {
  email: UserId;
  role: 'user';
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  permissions: {};
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface OurRefreshTokenClaims {}

// standard claims https://datatracker.ietf.org/doc/html/rfc7519#section-4.1
export interface AccessTokenPayload extends Jwt, OurAccessTokenClaims {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  jti: string;
}

// standard claims https://datatracker.ietf.org/doc/html/rfc7519#section-4.1
export interface RefreshTokenPayload extends Jwt, OurRefreshTokenClaims {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  jti: string;
}
