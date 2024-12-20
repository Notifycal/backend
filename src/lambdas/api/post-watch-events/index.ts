import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
  Context
} from 'aws-lambda';
import { baseMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';

const lambdaHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
  ctx: Context
): Promise<APIGatewayProxyResult> => {
  // Append awsRequestId to each log statement
  logger.appendKeys({ requestId: ctx.awsRequestId });
  logger.info('Invocation event', { event });

  logger.info('Event Body', { body: event.body });

  return {
    statusCode: 200,
    body: 'OK'
  };
};

export const handler = baseMiddleware().handler(lambdaHandler);
