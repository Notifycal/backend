import type { Brand, Email, IdpId, UnixTimestamp, UserId, Uuid } from '@own-types/model';
import { z } from 'zod';
import { idp } from './Identity';

export const jwtHeaderSchema = z.object({
  alg: z.string(),
  typ: z.string().optional(),
  kid: z.string().optional()
});

export function isBranded<T, B>(brand: B): (value: unknown) => value is Brand<T, B> {
  return (value: unknown): value is Brand<T, B> => {
    return typeof value === typeof (value as T) && (value as any).__brand === brand;
  };
}

const unsafeUuidSchema = z.string().uuid();
const userIdSchema = unsafeUuidSchema.refine(isBranded('UserId')).transform((v) => v as UserId);
const uuidSchema = unsafeUuidSchema.refine(isBranded('Uuid')).transform((v) => v as Uuid);
const unixTimestampSchema = z
  .number()
  .refine(isBranded('UnixTimestamp'))
  .transform((v) => v as UnixTimestamp);
const emailSchema = z
  .string()
  .email()
  .refine(isBranded('Email'))
  .transform((v) => v as Email);
const idpIdSchema = z
  .string()
  .refine(isBranded('IdpId'))
  .transform((v) => v as IdpId);

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
