import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { tracer } from '@powertools';

const dynamodbClient = DynamoDBDocumentClient.from(
  tracer.captureAWSv3Client(new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-1' }))
);

export { dynamodbClient };
