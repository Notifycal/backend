import type { MiddlewareObj, Request } from '@middy/core';
import type { AuthedAPIEventWithConfig } from '@model/lambda-events/ApiGatewayEvents';

import httpCors from '@middy/http-cors';
import type { CorsEndpointConfig } from '@model/Config';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';

export const corsErrorResponse: APIGatewayProxyResult = {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Origin not allowed' })
};

function corsCheck<TConfig extends CorsEndpointConfig>(): MiddlewareObj<
  AuthedAPIEventWithConfig<TConfig>,
  APIGatewayProxyResult
> {
  return {
    before: (request): APIGatewayProxyResult | void => {
      const origin = request.event.headers.origin || request.event.headers.Origin;
      const allowedOrigins = request.event.lambdaConfig.corsConfig.allowedOrigins;

      if (!origin || !allowedOrigins.includes(origin)) {
        return corsErrorResponse;
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
    origins: request.event.lambdaConfig.corsConfig.allowedOrigins,
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
  const corsCheckBefore = corsCheck<TConfig>().before;
  const middleware: MiddlewareObj<
    AuthedAPIEventWithConfig<TConfig>,
    APIGatewayProxyResult
  > = {
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
  
  if (corsCheckBefore) {
    middleware.before = corsCheckBefore;
  }
  
  return middleware;
}
