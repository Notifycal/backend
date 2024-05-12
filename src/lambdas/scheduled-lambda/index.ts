import { Context, ScheduledEvent, ScheduledHandler } from 'aws-lambda';

// TODO
import { Logger } from '@aws-lambda-powertools/logger';
const logger = new Logger();

/**
 * A Lambda function that spits out its invocation event
 */
export const handler: ScheduledHandler = async (event: ScheduledEvent, ctx: Context) => {
  // All log statements are written to CloudWatch

  // Append awsRequestId to each log statement
  logger.appendKeys({ requestId: ctx.awsRequestId });
  logger.info('Invocation event', { event });

  return;
};
