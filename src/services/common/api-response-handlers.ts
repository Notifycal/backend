import type { LogItemExtraInput, LogItemMessage } from '@aws-lambda-powertools/logger/types';
import type { APIGatewayProxyEvent } from '@aws-lambda-powertools/parser/types';
import { logger } from '@common/powertools';
import type { CorsEndpointConfig } from '@model/Config';
import type {
  ErrorResponseBody,
  ResponseHeaders,
  SuccessResponseBody
} from '@notifycal/shared/types';
import type { APIGatewayProxyResult } from 'aws-lambda';

export function baseHeaders(): ResponseHeaders {
  return {
    'Content-Type': 'application/json'
  };
}

export function _validateRequestOriginDomain(
  allowedOrigins: Array<string>,
  requestHeaders: Record<string, string | undefined>
): string | undefined {
  const origin = requestHeaders['origin'] || requestHeaders['Origin'] || requestHeaders['ORIGIN'];
  if (!origin) {
    return;
  }
  if (!allowedOrigins.includes(origin)) {
    return;
  }
  return origin;
}

export function validateRequestOriginDomain<TConfig extends { lambdaConfig: CorsEndpointConfig }>(
  event: Pick<APIGatewayProxyEvent, 'headers'> & TConfig
): string | undefined {
  return _validateRequestOriginDomain(
    event.lambdaConfig.corsConfig.allowedOrigins,
    event.headers || {}
  );
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
  body?: SuccessResponseBody,
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
  (body?: SuccessResponseBody): APIGatewayProxyResult => {
    return responseSuccess(body, statusCode);
  };

export const errorHandler =
  (statusCode: keyof typeof errorMessages, headers: ResponseHeaders = baseHeaders()) =>
  (reason: LogItemMessage, ...extraInput: LogItemExtraInput): APIGatewayProxyResult => {
    if (statusCode < 500) {
      logger.warn(reason, ...extraInput);
    } else {
      logger.error(reason, ...extraInput);
    }
    return responseError(statusCode, headers);
  };
