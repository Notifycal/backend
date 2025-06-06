import { EventBridgeSchema } from '@aws-lambda-powertools/parser/schemas';
import type z from 'zod';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function eventBridgeEventSchema<TSchema extends z.ZodTypeAny>(detailSchema: TSchema) {
  return EventBridgeSchema.extend({
    detail: detailSchema
  });
}
