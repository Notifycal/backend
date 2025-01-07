import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { tracer } from '@common/powertools';

export function dynamodbClient(): DynamoDBDocumentClient {
  return DynamoDBDocumentClient.from(
    tracer.captureAWSv3Client(
      new DynamoDBClient({
        // Ok, this is not elegant at all... but it will ALWAYS be provided by AWS
        // so this feels better than having to pass a config object all the way from the
        // lambda index/handler
        region: process.env.AWS_REGION || 'eu-west-1'
      })
    )
  );
}
