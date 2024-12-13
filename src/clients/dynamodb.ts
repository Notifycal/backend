import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { tracer } from '@powertools';

export function dynamodbClient(config: AwsConfig = defaultConfig): DynamoDBClient {
  return tracer.captureAWSv3Client(new DynamoDBClient({ 
    region: config.awsRegion,
    endpoint: config?.endpoint,
    credentials: config?.credentials
  }));
}
