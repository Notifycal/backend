import { APIGatewayProxyEventSchema } from '@aws-lambda-powertools/parser/schemas';
import type { AccessToken } from '@model/Jwt';
import type { APIGatewayProxyEventBase } from 'aws-lambda';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function apiEventSchema<TEndpointConfig>() {
  return APIGatewayProxyEventSchema.extend({
    version: z.string().optional(),
    routeKey: z.string().optional(),
    rawPath: z.string().optional(),
    rawQueryString: z.string().optional(),
    queryStringParameters: z.record(z.string(), z.string()).nullable().optional(),
    lambdaConfig: z.custom<TEndpointConfig>()
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function authedEventSchema<TEndpointConfig, TAccessToken = AccessToken>() {
  const schema = apiEventSchema<TEndpointConfig>();
  return schema.extend({
    requestContext: z.object({
      authorizer: z.custom<TAccessToken>()
    })
  });
}

export interface APIGatewayProxyEventWithRequestContext<
  TEndpointConfig,
  TAccessToken = AccessToken
> extends APIGatewayProxyEventBase<TAccessToken> {
  lambdaConfig: TEndpointConfig;
}

// ApiGateway Proxy Events
export type AuthedAPIEventWithConfig<
  TConfig,
  TAccessToken = AccessToken
> = APIGatewayProxyEventWithRequestContext<TConfig, TAccessToken>;
