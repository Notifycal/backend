import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Context
} from 'aws-lambda';
import { z } from 'zod';
import type middy from '@middy/core';
import type { AuthedEndpointConfig } from '@model/Config';
import { protectedEndpointMiddleware } from '@common/lambda-middleware';
import { getDefaultDecodeAccessJwtConfig } from './utils/jwt';
import { APIGatewayProxyEventV2Schema } from '@aws-lambda-powertools/parser/schemas/api-gatewayv2';
import type { AuthedAndConfigRequestContext } from '@model/ApiGatewayEvents';
import { JSONStringified } from '@aws-lambda-powertools/parser/helpers';

export interface TestingWhiteApiConfig extends AuthedEndpointConfig {
  config1: string;
}
const eventSchema = APIGatewayProxyEventV2Schema.extend({
  body: JSONStringified(
    z.object({
      'one-field': z.string()
    })
  ),
  requestContext: z.custom<AuthedAndConfigRequestContext<TestingWhiteApiConfig>>()
});
type Event = z.infer<typeof eventSchema>;

function lambdaHandler(
  event: Event,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  ctx: Context
): APIGatewayProxyStructuredResultV2 {
  console.log(event);
  return {
    statusCode: 200,
    body: 'OK'
  };
}

function testingConfigReader(): TestingWhiteApiConfig {
  return {
    config1: 'blah',
    decodeAccessJwtConfig: getDefaultDecodeAccessJwtConfig()
  };
}

function claimChecker(): boolean {
  return true;
}

export const handler: middy.MiddyfiedHandler<
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
  Error,
  Context
> = protectedEndpointMiddleware(testingConfigReader, eventSchema, claimChecker).handler(
  lambdaHandler
);
