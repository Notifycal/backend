import type { APIGatewayProxyEvent } from '@aws-lambda-powertools/parser/types';
import type { SignOptions } from '@model/Config';
import { accessTokenSchema } from '@model/Jwt';
import {
  getDefaultAccessTokenPayload,
  getDefaultEncodeAccessJwtConfig,
  testJwt,
  type tokenSchemaSkeleton
} from '@testing/utils/jwt';
import type { Context } from 'aws-lambda/handler';
import type { z } from 'zod';

function ttestEvent(
  body: string,
  headers: Record<string, string> = {},
  queryStringParameters: Record<string, string> = {}
): APIGatewayProxyEvent {
  return {
    body: body,
    isBase64Encoded: false,
    resource: '/api/v1/login',
    path: '/api/v1/login',
    httpMethod: 'POST',
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
      'content-type': 'application/json',
      Host: 'a4dry64voi.execute-api.eu-west-1.amazonaws.com',
      origin: 'http://localhost:5173',
      priority: 'u=1, i',
      referer: 'http://localhost:5173/',
      'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'X-Amzn-Trace-Id': 'Root=1-67798012-1dd3f9916121fc131d25283e',
      'X-Forwarded-For': '83.39.36.161',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      ...headers
    },
    multiValueHeaders: {
      accept: ['application/json, text/plain, */*'],
      'accept-encoding': ['gzip, deflate, br, zstd'],
      'accept-language': ['en-GB,en-US;q=0.9,en;q=0.8'],
      'content-type': ['application/json'],
      Host: ['a4dry64voi.execute-api.eu-west-1.amazonaws.com'],
      origin: ['http://localhost:5173'],
      priority: ['u=1, i'],
      referer: ['http://localhost:5173/'],
      'sec-ch-ua': ['"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"'],
      'sec-ch-ua-mobile': ['?0'],
      'sec-ch-ua-platform': ['"macOS"'],
      'sec-fetch-dest': ['empty'],
      'sec-fetch-mode': ['cors'],
      'sec-fetch-site': ['cross-site'],
      'User-Agent': [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      ],
      'X-Amzn-Trace-Id': ['Root=1-67798012-1dd3f9916121fc131d25283e'],
      'X-Forwarded-For': ['83.39.36.161'],
      'X-Forwarded-Port': ['443'],
      'X-Forwarded-Proto': ['https']
    },
    queryStringParameters: queryStringParameters,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {
      resourceId: 'fdr0ov',
      resourcePath: '/api/v1/login',
      operationName: 'login',
      httpMethod: 'POST',
      extendedRequestId: 'D4Dy8GjNDoEEXbw=',
      requestTime: '04/Jan/2025:18:38:10 +0000',
      path: '/dev/api/v1/login',
      accountId: '381492094204',
      protocol: 'HTTP/1.1',
      stage: 'dev',
      domainPrefix: 'a4dry64voi',
      requestTimeEpoch: 1736015890429,
      requestId: '99d29563-af60-4691-96d3-d0e2d697e510',
      identity: {
        cognitoIdentityPoolId: null,
        accountId: null,
        cognitoIdentityId: null,
        caller: null,
        sourceIp: '83.39.36.161',
        principalOrgId: null,
        accessKey: null,
        cognitoAuthenticationType: null,
        cognitoAuthenticationProvider: null,
        userArn: null,
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        user: null
      },
      domainName: 'a4dry64voi.execute-api.eu-west-1.amazonaws.com',
      deploymentId: 'uzozvo',
      apiId: 'a4dry64voi'
    }
  };
}

export function unsafeTestEvent(
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ /* eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types */
  body: any,
  headers: Record<string, string> = {},
  queryStringParameters: Record<string, string> = {}
): APIGatewayProxyEvent {
  return ttestEvent(JSON.stringify(body), headers, queryStringParameters);
}

export function testEvent<TEventBody>(
  body: TEventBody,
  headers: Record<string, string> = {},
  queryStringParameters: Record<string, string> = {}
): APIGatewayProxyEvent {
  return ttestEvent(JSON.stringify(body), headers, queryStringParameters);
}

export function testAuthedEvent<
  TEventBody,
  TSchema extends typeof tokenSchemaSkeleton,
  TConfig extends SignOptions & { privateKey: string }
>(
  body: TEventBody,
  headers: Record<string, string> = {},
  jwtSchema: TSchema = accessTokenSchema as unknown as TSchema,
  jwtPayload: z.infer<typeof jwtSchema.shape.payload> = getDefaultAccessTokenPayload(),
  encodeJwtConfig: TConfig = getDefaultEncodeAccessJwtConfig() as unknown as TConfig
): Promise<APIGatewayProxyEvent> {
  return testJwt(jwtSchema, jwtPayload, encodeJwtConfig).then((jwt) =>
    ttestEvent(JSON.stringify(body), { ...headers, Authorization: `Bearer ${jwt}` })
  );
}

export const c: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'fnName',
  functionVersion: 'test',
  invokedFunctionArn: 'arn:test',
  memoryLimitInMB: '100mb',
  awsRequestId: 'someId',
  logGroupName: 'logGroupName',
  logStreamName: 'logStreamName',
  getRemainingTimeInMillis: () => 1,

  done: () => {},

  fail: () => {},

  succeed: () => {}
};
