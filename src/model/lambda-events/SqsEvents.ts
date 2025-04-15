import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { SqsSchema } from '@aws-lambda-powertools/parser/schemas';
import type { SQSEvent } from 'aws-lambda';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function eventSqsSchema<TLambdaConfig, TSchema extends z.ZodTypeAny>(
  recordBodySchema: TSchema
) {
  const extendedRecordSchema = SqsSchema.shape.Records.element.extend({
    body: JSONStringified(recordBodySchema)
  });
  return z.object({
    lambdaConfig: z.custom<TLambdaConfig>(),
    Records: extendedRecordSchema.array()
  });
}

export interface SqsEventWithRequestContext<TLambdaConfig> extends SQSEvent {
  lambdaConfig: TLambdaConfig;
}
