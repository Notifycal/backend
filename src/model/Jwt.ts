import type { UnixTimestamp, Uuid } from './../own-types/model';
import type { UserId } from '@own-types/model';
import { z } from 'zod';

export const jwtHeaderSchema = z.object({
  alg: z.string(),
  typ: z.string().optional(),
  kid: z.string().optional()
});

const unsafeUuidSchema = z.string().uuid();
const userIdSchema = unsafeUuidSchema.transform((v) => v as UserId);
const uuidSchema = unsafeUuidSchema.transform((v) => v as Uuid);
const unixTimestampSchema = z.number().transform((v) => v as UnixTimestamp);

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

export const ourAccessTokenClaimsSchema = z.object({
  userId: userIdSchema,
  role: z.literal('user'),
  permissions: z.object({})
});
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
