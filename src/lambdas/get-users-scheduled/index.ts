import { Context, ScheduledEvent, ScheduledHandler } from 'aws-lambda';

import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const { USERS_SQS_QUEUE_URL, USERS_DYNAMO_TABLE, AWS_REGION } = process.env;

// TODO
import { Logger } from '@aws-lambda-powertools/logger';
const logger = new Logger();

const sqsClient = new SQSClient({ region: AWS_REGION });

export const handler: ScheduledHandler = async (event: ScheduledEvent, ctx: Context) => {
  // All log statements are written to CloudWatch

  // Append awsRequestId to each log statement
  logger.appendKeys({ requestId: ctx.awsRequestId });
  logger.info('Invocation event', { event });

  // TODO: add user email to MessageAttributes/MessageGroupId?
  const input = {
    // SendMessageRequest
    QueueUrl: USERS_SQS_QUEUE_URL,
    MessageBody: 'I am a SQS message!'
  };

  const command = new SendMessageCommand(input);
  const response = await sqsClient.send(command);

  console.log(response);

  return;
};
