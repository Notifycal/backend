import { SqsSchema } from '@aws-lambda-powertools/parser/schemas';
import type { SQSEvent } from 'aws-lambda';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function eventSqsSchema<TLambdaConfig>() {
  return SqsSchema.extend({
    lambdaConfig: z.custom<TLambdaConfig>()
  });
}

export interface SqsEventWithRequestContext<TLambdaConfig> extends SQSEvent {
  lambdaConfig: TLambdaConfig;
}
