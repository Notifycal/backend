import { z } from 'zod';
import type { IdpName } from './Identity';

export const jwtHeaderSchema = z.object({
  alg: z.string(),
  typ: z.string().optional(),
  kid: z.string().optional()
});

const unsafeUuidSchema = z.string().uuid();
const userIdSchema = unsafeUuidSchema.brand('UserId').or(unsafeUuidSchema.brand('Uuid'));
const uuidSchema = unsafeUuidSchema.brand('Uuid');
const unixTimestampSchema = z.number().brand('UnixTimestamp');
const emailSchema = z.string().email().brand('Email');
const idpIdSchema = z.string().brand('IdpId');

const tokenPayloadBaseSchema = z.object({
  iss: z.string(),
  sub: userIdSchema,
  aud: z.string(),
  exp: unixTimestampSchema,
  iat: unixTimestampSchema,
  jti: uuidSchema
});
const tokenSchemaBase = z.object({
  header: jwtHeaderSchema,
  signature: z.string()
});

export const idp: Record<IdpName, IdpName> = {
  'google.com': 'google.com'
};

const identitySchema = z.object({
  userId: userIdSchema,
  email: emailSchema,
  idp: z.nativeEnum(idp),
  idpId: idpIdSchema
});
export const ourAccessTokenClaimsSchema = z
  .object({
    role: z.literal('user'),
    permissions: z.object({})
  })
  .merge(identitySchema);
export const accessTokenPayloadSchema = tokenPayloadBaseSchema.merge(ourAccessTokenClaimsSchema);
export const accessTokenSchema = tokenSchemaBase.extend({
  payload: accessTokenPayloadSchema
});

export const ourRefreshTokenClaimsSchema = z.object({});
export const refreshTokenPayloadSchema = tokenPayloadBaseSchema.merge(ourRefreshTokenClaimsSchema);
export const refreshTokenSchema = tokenSchemaBase.extend({
  payload: refreshTokenPayloadSchema
});

export type OurAccessTokenClaims = z.infer<typeof ourAccessTokenClaimsSchema>;
export type OurRefreshTokenClaims = z.infer<typeof ourRefreshTokenClaimsSchema>;
export type AccessToken = z.infer<typeof accessTokenSchema>;
export type RefreshToken = z.infer<typeof refreshTokenSchema>;
