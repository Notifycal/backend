import type { MiddlewareObj, Request } from '@middy/core';
import type { AuthedEventWithConfig } from '../model/api/ApiGatewayEvents';

import httpCors from '@middy/http-cors';
import type { AuthedEndpointConfig } from '@model/Config';
import type { APIGatewayProxyResult, Context } from 'aws-lambda';

function configureMiddleware<TConfig extends AuthedEndpointConfig>(
  request: Request<AuthedEventWithConfig<TConfig>, APIGatewayProxyResult, Error, Context>
): MiddlewareObj {
  const frontendDomain = request.event.endpointConfig.baseConfig.frontendDomain;
  const options = {
    headers: 'GET,POST,OPTIONS,PUT,DELETE,PATCH',
    methods: 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    origin: frontendDomain,
    vary: 'Origin'
  };
  return httpCors(options);
}

export function corsMiddleware<TConfig extends AuthedEndpointConfig>(): MiddlewareObj<
  AuthedEventWithConfig<TConfig>,
  APIGatewayProxyResult
> {
  return {
    after: (req: Request<AuthedEventWithConfig<TConfig>, APIGatewayProxyResult, Error, Context>) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      configureMiddleware(req).after?.(req),
    onError: (
      req: Request<AuthedEventWithConfig<TConfig>, APIGatewayProxyResult, Error, Context>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    ) => configureMiddleware(req).onError?.(req)
  };
}
