import { z } from 'zod';

export const jwtHeaderSchema = z.object({
  alg: z.string(),
  typ: z.optional(z.string()),
  kid: z.optional(z.string())
});

const tokenPayloadBaseSchema = z.object({
  iss: z.string(),
  sub: z.string(),
  aud: z.string(),
  exp: z.number(),
  iat: z.number(),
  jti: z.string()
});
const tokenSchemaBase = z.object({
  header: jwtHeaderSchema,
  signature: z.string()
});

export const ourAccessTokenClaimsSchema = z.object({
  email: z.string().email(),
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
