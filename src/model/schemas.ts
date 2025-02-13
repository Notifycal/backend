import { z } from 'zod';

export const templateSchema = z.object({
  id: z.string().brand('TemplateId'),
  fields: z.object({
    business: z.object({
      name: z.string().brand('BusinessName'),
      address: z.string().brand('BusinessAddress')
    })
  })
});

export const idpAuthorizationSchema = z.object({
  refreshToken: z.string()
});

export const runSchema = z.object({
  lowerBoundStartTime: z.string().brand('DateTime'),
  upperBoundStartTime: z.string().brand('DateTime')
});
