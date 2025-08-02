import { DynamoDBMarshalled } from '@aws-lambda-powertools/parser/helpers/dynamodb';
import { DynamoDBStreamSchema } from '@aws-lambda-powertools/parser/schemas';
import { DynamoDBStreamChangeRecordBase } from '@aws-lambda-powertools/parser/schemas/dynamodb';
import z from 'zod';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function dynamoDbStreamsSchema<TNewImageSchema extends z.ZodTypeAny, TConfig>(
  newImageSchema: TNewImageSchema
) {
  const dynamodbSchema = DynamoDBStreamChangeRecordBase.extend({
    NewImage: DynamoDBMarshalled<z.infer<typeof newImageSchema>>(
      newImageSchema as z.ZodType<z.output<TNewImageSchema>>
    )
  });

  const extendedRecordSchema = DynamoDBStreamSchema.shape.Records.element.extend({
    dynamodb: dynamodbSchema
  });

  return z.object({
    lambdaConfig: z.custom<TConfig>(),
    Records: extendedRecordSchema.array()
  });
}
