import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';
import { DynamoDBStreamSchema } from '@aws-lambda-powertools/parser/schemas';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function dynamoDbStreamSchema<TLambdaConfig, TSchema extends z.ZodTypeAny>(
  recordBodySchema: TSchema
) {
  const extendedRecordSchema = DynamoDBStreamSchema.shape.Records.element.extend({
    body: JSONStringified(recordBodySchema)
  });
  return z.object({
    lambdaConfig: z.custom<TLambdaConfig>(),
    Records: extendedRecordSchema.array()
  });
}
