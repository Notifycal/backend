import { SQSClient } from '@aws-sdk/client-sqs';
import { tracer } from '@common/powertools';

const sqsClient = tracer.captureAWSv3Client(
  new SQSClient({
    region: process.env.AWS_REGION || 'eu-west-1'
  })
);

export { sqsClient };
