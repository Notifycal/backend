import { Context, SQSEvent, SQSHandler } from 'aws-lambda';

import { logger, metrics, tracer } from '@powertools';
import middy from '@middy/core';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';

/**
 * A Lambda function that spits out its invocation event
 */
const lambdaHandler: SQSHandler = async (event: SQSEvent, ctx: Context) => {
  // All log statements are written to CloudWatch

  // Append awsRequestId to each log statement
  logger.appendKeys({ requestId: ctx.awsRequestId });
  logger.info('Invocation event', { event });

  return;
};

export const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics, { captureColdStartMetric: true }));
