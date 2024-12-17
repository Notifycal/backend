import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { tracer } from '@powertools';
import { AwsConfig, defaultConfig } from 'model/AwsConfig';

export function dynamodbClient(config: AwsConfig = defaultConfig): DynamoDBClient {
  return DynamoDBDocumentClient.from(
    tracer.captureAWSv3Client(
      new DynamoDBClient({
        region: config.awsRegion,
        endpoint: config?.endpoint,
        credentials: config?.credentials
      })
    )
  );
}
