import type { LogItemMessage } from '@aws-lambda-powertools/logger/types';
import { logger } from '@common/powertools';
import type { ErrorResponseBody, ResponseHeaders, SuccessResponseBody } from '@model/Api';
import type { APIGatewayProxyResult } from 'aws-lambda';

export function baseHeaders(): ResponseHeaders {
  return {
    'Content-Type': 'application/json'
  };
}

export function headers(allowedOrigin: string): ResponseHeaders {
  return {
    ...baseHeaders(),
    'Access-Control-Allow-Headers': 'GET,POST,OPTIONS,PUT,DELETE,PATCH',
    'Access-Control-Allow-Methods':
      'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Origin': allowedOrigin,
    Vary: 'Origin'
  };
}

export const errorMessages: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorised',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'KO'
};

export function responseSuccess(
  body: SuccessResponseBody,
  statusCode = 200,
  headers: ResponseHeaders = baseHeaders()
): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers
  };
}

export function responseError(
  statusCode: keyof typeof errorMessages,
  headers: ResponseHeaders = baseHeaders()
): APIGatewayProxyResult {
  const payload: ErrorResponseBody = { message: errorMessages[statusCode] };
  return {
    statusCode,
    body: JSON.stringify(payload),
    headers
  };
}

export const successHandler =
  (statusCode = 200) =>
  (body: SuccessResponseBody): APIGatewayProxyResult => {
    return responseSuccess(body, statusCode);
  };

export const errorHandler =
  (statusCode: keyof typeof errorMessages, headers: ResponseHeaders = baseHeaders()) =>
  (reason: LogItemMessage): APIGatewayProxyResult => {
    if (statusCode < 500) {
      logger.warn(reason);
    } else {
      logger.error(reason);
    }
    return responseError(statusCode, headers);
  };
