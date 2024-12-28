import { LogItemMessage } from '@aws-lambda-powertools/logger/types';
import { logger } from '@common/powertools';
import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

const headers = {
  'Content-Type': 'application/json'
};

const errorMessages: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorised',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'KO'
};

export const successHandler =
  (statusCode = 200) =>
  (body: object): APIGatewayProxyStructuredResultV2 => {
    return responseSuccess(body, statusCode);
  };

export const errorHandler =
  (statusCode: keyof typeof errorMessages) =>
  (reason: LogItemMessage): APIGatewayProxyStructuredResultV2 => {
    if (statusCode < 500) {
      logger.warn(reason);
    } else {
      logger.error(reason);
    }
    return responseError(statusCode);
  };

export function responseSuccess(body: object, statusCode = 200) {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers
  };
}

export function responseError(statusCode: keyof typeof errorMessages) {
  return {
    statusCode,
    body: JSON.stringify({ message: errorMessages[statusCode] }),
    headers
  };
}
