import { Context, ScheduledEvent, ScheduledHandler } from 'aws-lambda';

import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

import { dynamodbClient } from '@clients/dynamodb';
import { sqsClient } from '@clients/sqs';

// Tracing, logging and metrics setup
import { logger, metrics, tracer } from '@powertools';

import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import middy from '@middy/core';

const { USERS_SQS_QUEUE_URL, USERS_DYNAMO_TABLE } = process.env;

const queueUserPromise = (user) => {
  logger.info('Queueing message for user', { user });
  const command = new SendMessageCommand({
    // TODO: add user email to MessageAttributes/MessageGroupId?
    QueueUrl: USERS_SQS_QUEUE_URL,
    MessageBody: JSON.stringify({
      UserId: user.UserId
    })
  });
  return sqsClient.send(command);
};

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
  const response = await dynamodbClient.send(command);
  const users = response.Items;

  let success: boolean;

  if (users !== undefined) {
    const sendUsersPromises = users.map(queueUserPromise);

    try {
      const responses = await Promise.all(sendUsersPromises);
      metrics.addMetric('successfulGetUsers', MetricUnit.Count, responses.length);
      logger.info('Users successfully queued');
      success = true;
    } catch (error) {
      let errorMessage = '';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      logger.error('Error queueing one or more users:', errorMessage);

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
