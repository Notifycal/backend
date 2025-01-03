import type { APIGatewayProxyEventBase } from 'aws-lambda';
import type { AccessToken } from './Jwt';
import { APIGatewayProxyEventSchema } from '@aws-lambda-powertools/parser/schemas';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function eventSchema<TEndpointConfig>() {
  return APIGatewayProxyEventSchema.extend({
    endpointConfig: z.custom<TEndpointConfig>()
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function authedEventSchema<TEndpointConfig>() {
  const schema = eventSchema<TEndpointConfig>();
  return schema.extend({
    requestContext: z.object({
      authorizer: z.custom<AccessToken>()
    })
  });
}

interface APIGatewayProxyEventWithRequestContext<TEndpointConfig>
  extends APIGatewayProxyEventBase<AccessToken> {
  endpointConfig: TEndpointConfig;
}

// ApiGateway Proxy Events
export type EventWithConfig<TConfig> = APIGatewayProxyEventWithRequestContext<TConfig>;

export type AuthedEventWithConfig<TConfig> = APIGatewayProxyEventWithRequestContext<TConfig>;

export interface ResponseHeaders {
  [header: string]: boolean | number | string;
}
