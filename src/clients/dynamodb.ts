import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { tracer } from '@common/powertools';
import { AwsConfig, defaultConfig } from '@model/Config';

export function dynamodbClient(config: AwsConfig = defaultConfig): DynamoDBDocumentClient {
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
