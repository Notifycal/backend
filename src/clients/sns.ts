import { SNSClient } from '@aws-sdk/client-sns';

import { tracer } from '@common/powertools';

export function snsClient(): SNSClient {
  return tracer.captureAWSv3Client(
    new SNSClient({
      region: process.env.AWS_REGION || 'eu-west-1'
    })
  );
}
