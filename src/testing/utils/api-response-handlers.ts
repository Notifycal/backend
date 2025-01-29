import type {
  AuthenticationResponse,
  ErrorResponseBody,
  SuccessResponseBody
} from '@model/api/Api';
import { baseHeaders, errorMessages, headers } from '@services/common/api-response-handlers';
import type { APIGatewayProxyResult } from 'aws-lambda';

export function responseSuccess(
  body?: SuccessResponseBody | AuthenticationResponse,
  statusCode = 200,
  allowedOrigin: string = 'http://localhost:5173'
): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: headers(allowedOrigin)
  };
}

export function responseError(
  statusCode: keyof typeof errorMessages,
  allowedOrigin: string = 'http://localhost:5173'
): APIGatewayProxyResult {
  const payload: ErrorResponseBody = { message: errorMessages[statusCode] };
  return {
    statusCode,
    body: JSON.stringify(payload),
    headers: headers(allowedOrigin)
  };
}

export function responseErrorNoCorsHeaders(
  statusCode: keyof typeof errorMessages
): APIGatewayProxyResult {
  const payload: ErrorResponseBody = { message: errorMessages[statusCode] };
  return {
    statusCode,
    body: JSON.stringify(payload),
    headers: {
      ...baseHeaders()
    }
  };
}
