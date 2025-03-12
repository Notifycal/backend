import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { SqsSchema } from '@aws-lambda-powertools/parser/schemas';
import type { SQSEvent } from 'aws-lambda';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function eventSqsSchema<TLambdaConfig, TSchema extends z.ZodTypeAny>(
  recordBodySchema: TSchema
) {
  const schema = SqsSchema.extend({
    lambdaConfig: z.custom<TLambdaConfig>()
  });
  return schema.extend({
    Records: schema.shape.Records.element
      .extend({
        body: JSONStringified(recordBodySchema)
      })
      .array()
  });
}

export interface SqsEventWithRequestContext<TLambdaConfig> extends SQSEvent {
  lambdaConfig: TLambdaConfig;
}
