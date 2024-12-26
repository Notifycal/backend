import { logger } from '@common/powertools';
import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export function successHandler(body: object): APIGatewayProxyStructuredResultV2 {
  return response200(body);
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function unauthorisedHandler(reason: any): APIGatewayProxyStructuredResultV2 {
  logger.warn(reason);
  return response401;
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function forbiddenHandler(reason: any): APIGatewayProxyStructuredResultV2 {
  logger.warn(reason);
  return response403;
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function notFoundHandler(reason: any): APIGatewayProxyStructuredResultV2 {
  logger.warn(reason);
  return response404;
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function internalErrorHandler(error: any): APIGatewayProxyStructuredResultV2 {
  logger.error(error);
  return response500;
}
export const response200 = (body: object) => ({
  statusCode: 200,
  body: JSON.stringify(body),
  headers: {
    'Content-Type': 'application/json'
  }
});

export const response400 = {
  statusCode: 400,
  body: JSON.stringify({ message: 'Bad Request' }),
  headers: {
    'Content-Type': 'application/json'
  }
};

export const response401 = {
  statusCode: 401,
  body: JSON.stringify({ message: 'Unauthorised' }),
  headers: {
    'Content-Type': 'application/json'
  }
};

export const response403 = {
  statusCode: 403,
  body: JSON.stringify({ message: 'Forbidden' }),
  headers: {
    'Content-Type': 'application/json'
  }
};

export const response404 = {
  statusCode: 404,
  body: JSON.stringify({ message: 'Not Found' }),
  headers: {
    'Content-Type': 'application/json'
  }
};

export const response500 = {
  statusCode: 500,
  body: JSON.stringify({ message: 'KO' }),
  headers: {
    'Content-Type': 'application/json'
  }
};
