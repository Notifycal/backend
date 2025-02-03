import { APIGatewayProxyEventSchema } from '@aws-lambda-powertools/parser/schemas';
import type { APIGatewayProxyEventBase } from 'aws-lambda';
import { z } from 'zod';
import type { AccessToken } from '../Jwt';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function apiEventSchema<TEndpointConfig>() {
  return APIGatewayProxyEventSchema.extend({
    version: z.string().optional(),
    routeKey: z.string().optional(),
    rawPath: z.string().optional(),
    rawQueryString: z.string().optional(),
    queryStringParameters: z.record(z.string()).nullable().optional(),
    lambdaConfig: z.custom<TEndpointConfig>()
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function authedEventSchema<TEndpointConfig>() {
  const schema = apiEventSchema<TEndpointConfig>();
  return schema.extend({
    requestContext: z.object({
      authorizer: z.custom<AccessToken>()
    })
  });
}

export interface APIGatewayProxyEventWithRequestContext<TEndpointConfig>
  extends APIGatewayProxyEventBase<AccessToken> {
  lambdaConfig: TEndpointConfig;
}

// ApiGateway Proxy Events
export type AuthedAPIEventWithConfig<TConfig> = APIGatewayProxyEventWithRequestContext<TConfig>;
