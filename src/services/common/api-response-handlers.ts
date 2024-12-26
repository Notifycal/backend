import { logger } from '@common/powertools';
import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export function successHandler(body: object): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 200,
    body: JSON.stringify(body)
  };
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function authenticationFailureHandler(reason: any): APIGatewayProxyStructuredResultV2 {
  logger.warn(reason);
  return {
    statusCode: 401,
    body: JSON.stringify({ message: 'Unauthorised' })
  };
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function forbiddenHandler(reason: any): APIGatewayProxyStructuredResultV2 {
  logger.warn(reason);
  return {
    statusCode: 403,
    body: JSON.stringify({ message: 'Forbidden' })
  };
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function notFoundHandler(reason: any): APIGatewayProxyStructuredResultV2 {
  logger.warn(reason);
  return {
    statusCode: 404,
    body: JSON.stringify({ message: 'Not Found' })
  };
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function internalErrorHandler(error: any): APIGatewayProxyStructuredResultV2 {
  logger.error(error);
  return {
    statusCode: 500,
    body: JSON.stringify({ message: 'KO' })
  };
}
