import { baseHeaders, errorMessages, headers } from '@services/common/api-response-handlers';
import type { APIGatewayProxyResult } from 'aws-lambda';

export function responseSuccess(
  body: object,
  statusCode = 200,
  allowedOrigin: string = 'http://localhost'
): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: headers(allowedOrigin)
  };
}

export function responseError(
  statusCode: keyof typeof errorMessages,
  allowedOrigin: string = 'http://localhost'
): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify({ message: errorMessages[statusCode] }),
    headers: headers(allowedOrigin)
  };
}

export function responseErrorNoCorsHeaders(
  statusCode: keyof typeof errorMessages
): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify({ message: errorMessages[statusCode] }),
    headers: {
      ...baseHeaders()
    }
  };
}
