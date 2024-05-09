import { Context, ScheduledEvent, ScheduledHandler } from 'aws-lambda';

import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ScanCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// TODO
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';

import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';

import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';

import middy from '@middy/core';

const { USERS_SQS_QUEUE_URL, USERS_DYNAMO_TABLE, AWS_REGION } = process.env;

// Tracing, logging and metrics setup
const tracer = new Tracer();
const logger = new Logger(); // All log statements are written to CloudWatch
const metrics = new Metrics();

// AWS client initialization (with tracing)
const sqsClient = tracer.captureAWSv3Client(new SQSClient({ region: AWS_REGION }));
const dynamoDBDocumentClient = tracer.captureAWSv3Client(
  new DynamoDBClient({ region: AWS_REGION })
);
const documentClient = DynamoDBDocumentClient.from(dynamoDBDocumentClient);

// Lambda code goes here
const lambdaHandler: ScheduledHandler = async (event: ScheduledEvent, ctx: Context) => {
  // Append awsRequestId to each log statement
  logger.appendKeys({ requestId: ctx.awsRequestId });
  logger.info('Invocation event', { event });

  // The future might require pagination
  const commandPayload = {
    TableName: USERS_DYNAMO_TABLE
  };
  const command = new ScanCommand(commandPayload);

  logger.info('Requesting user list from DynamoDB', commandPayload);
  const response = await documentClient.send(command);
  const users = response.Items;

  let success: boolean;

  if (users !== undefined) {
    const sendUsersPromises = users.map((user) => {
      logger.info('Queueing message for user', { user });
      const command = new SendMessageCommand({
        // TODO: add user email to MessageAttributes/MessageGroupId?
        QueueUrl: USERS_SQS_QUEUE_URL,
        MessageBody: JSON.stringify({
          UserId: user.UserId
        })
      });
      return sqsClient.send(command);
    });

    try {
      const responses = await Promise.all(sendUsersPromises);
      metrics.addMetric('successfulGetUsers', MetricUnit.Count, responses.length);
      logger.info('Users successfully queued');
      success = true;
    } catch (error) {
      logger.error('Error queueing one or more users:', error);
      success = false;
    }
  } else {
    metrics.addMetric('successfulGetUsers', MetricUnit.Count, 0);
    success = false;
  }

  tracer.putAnnotation('successfulGetUsers', success);

  return;
};

// https://middy.js.org/docs/integrations/lambda-powertools#using-multiple-utilities
// Wrap the handler with middy
export const handler = middy(lambdaHandler)
  // Use the middleware by passing the Tracer instance as a parameter
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }));
