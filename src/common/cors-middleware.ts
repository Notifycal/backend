import type { MiddlewareObj, Request } from '@middy/core';
import type { AuthedAPIEventWithConfig } from '@model/lambda-events/ApiGatewayEvents';

import httpCors from '@middy/http-cors';
import type { CorsEndpointConfig } from '@model/Config';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';

function corsCheck<TConfig extends CorsEndpointConfig>(): MiddlewareObj<
  AuthedAPIEventWithConfig<TConfig>,
  APIGatewayProxyResult
> {
  return {
    before: (request): APIGatewayProxyResult | void => {
      const origin = request.event.headers.origin || request.event.headers.Origin;
      const allowedOrigins = request.event.lambdaConfig.corsConfig.allowedDomains;

      if (!origin || !allowedOrigins.includes(origin)) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Origin not allowed' })
        };
      }
    }
  };
}

function configureMiddleware<TConfig extends CorsEndpointConfig>(
  request: Request<AuthedAPIEventWithConfig<TConfig>, APIGatewayProxyResult, Error, Context>
): MiddlewareObj<AuthedAPIEventWithConfig<TConfig>, APIGatewayProxyResult> {
  const options = {
    headers: 'GET,POST,OPTIONS,PUT,DELETE,PATCH',
    methods: 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    origins: request.event.lambdaConfig.corsConfig.allowedDomains,
    vary: 'Origin'
  };
  return httpCors(options) as MiddlewareObj<
    AuthedAPIEventWithConfig<TConfig>,
    APIGatewayProxyResult
  >;
}

export function corsMiddleware<TConfig extends CorsEndpointConfig>(): MiddlewareObj<
  AuthedAPIEventWithConfig<TConfig>,
  APIGatewayProxyResult
> {
  return {
    before: corsCheck<TConfig>().before,
    after: (
      req: Request<AuthedAPIEventWithConfig<TConfig>, APIGatewayProxyResult, Error, Context>
    ) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      configureMiddleware(req).after?.(req),
    onError: (
      req: Request<AuthedAPIEventWithConfig<TConfig>, APIGatewayProxyResult, Error, Context>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    ) => configureMiddleware(req).onError?.(req)
  };
}