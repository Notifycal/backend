import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
  Context
} from 'aws-lambda';

// TODO
import { Logger } from '@aws-lambda-powertools/logger';
const logger = new Logger();

/**
 * A Lambda function that spits out its invocation event
 */
export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
  ctx: Context
): Promise<APIGatewayProxyResult> => {
  // All log statements are written to CloudWatch

  logger.info('Invocation event', { event });
  // Append awsRequestId to each log statement
  logger.appendKeys({ requestId: ctx.awsRequestId });

  logger.info('Event Body', { body: event.body });

  return {
    statusCode: 200,
    body: 'OKgdfhg99'
  };
};
