import { DynamoDBMarshalled } from '@aws-lambda-powertools/parser/helpers/dynamodb';
import { DynamoDBStreamSchema } from '@aws-lambda-powertools/parser/schemas';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function createDynamoDBStreamEventSchema<
  TNewImageSchema extends z.ZodTypeAny,
  TEndpointConfig
>(payloadSchemas: TNewImageSchema, configType?: z.ZodType<TEndpointConfig>) {
  const dynamodbSchema = DynamoDBStreamSchema.shape.Records.element.shape.dynamodb
    .innerType()
    .extend({
      NewImage: DynamoDBMarshalled(payloadSchemas)
    });

  const extendedRecordSchema = DynamoDBStreamSchema.shape.Records.element.extend({
    dynamodb: dynamodbSchema
  });

  return z.object({
    lambdaConfig: configType || z.custom<TEndpointConfig>(),
    Records: extendedRecordSchema.array()
  });
}
