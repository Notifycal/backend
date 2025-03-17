import { z } from 'zod';

export const vonageAccessTokenSchema = z.object({
  header: z.object({
    alg: z.string(),
    typ: z.string()
  }),
  payload: z.object({
    jti: z.string(),
    iat: z.number(),
    iss: z.string(),
    // eslint-disable-next-line camelcase
    api_key: z.string(),
    // eslint-disable-next-line camelcase
    application_id: z.string(),
    // eslint-disable-next-line camelcase
    payload_hash: z.string().optional()
  }),
  signature: z.string()
});
