import * as crypto from 'node:crypto';

import { Context, ScheduledEvent, ScheduledHandler } from 'aws-lambda';

import { SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
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

import { User } from 'model/User';

const CHUNK_SIZE = 10; // Max AWS SQS BatchMessageSend number of messages
const { USERS_SQS_QUEUE_URL, USERS_DYNAMO_TABLE } = process.env;

const queueUserBatchPromise = (userBatch: User[]) => {
  logger.info('Queueing batch');
  const command = new SendMessageBatchCommand({
    QueueUrl: USERS_SQS_QUEUE_URL,
    Entries: userBatch.map((user) => ({
      Id: crypto.createHash('sha1').update(user.UserId).digest('hex'),
      MessageBody: JSON.stringify({
        UserId: user.UserId
      })
    }))
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
  const users = response.Items as User[];

  if (!users) {
    throw new Error('Something went wrong.');
  }

  for (let i = 0; i < users.length; i += CHUNK_SIZE) {
    await queueUserBatchPromise(users.slice(i, i + CHUNK_SIZE));
  }

  return;
};

// https://middy.js.org/docs/integrations/lambda-powertools#using-multiple-utilities
// Wrap the handler with middy
export const handler = middy(lambdaHandler)
  // Use the middleware by passing the Tracer instance as a parameter
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }));
