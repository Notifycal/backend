import type { MiddlewareObj, Request } from '@middy/core';
import { throwError } from '@services/common/error-handling';

interface RunOptions<TRequest> {
  handler: (arg0: TRequest) => void | Promise<void>;
  action: string;
}

function run<TRequest>({
  handler,
  action
}: RunOptions<TRequest>): (request: Request<TRequest>) => Promise<void> {
  return async (request: Request<TRequest>) => {
    try {
      await handler(request.event);
    } catch (error) {
      throwError(`Error during ${action} middleware`, error);
    }
  };
}

interface SetupMiddlewareOptions<TRequest> {
  setupFn?: (arg0: TRequest) => void | Promise<void>;
  tidyUpFn?: (arg0: TRequest) => void | Promise<void>;
  onErrorFn?: (arg0: TRequest) => void | Promise<void>;
}

export function setupMiddleware<TRequest>({
  setupFn,
  tidyUpFn,
  onErrorFn
}: SetupMiddlewareOptions<TRequest> = {}): MiddlewareObj<TRequest> {
  return {
    before: setupFn ? run({ handler: setupFn, action: 'setup' }) : (): void => {},
    after: tidyUpFn ? run({ handler: tidyUpFn, action: 'tidy up' }) : (): void => {},
    onError: onErrorFn ? run({ handler: onErrorFn, action: 'on error' }) : (): void => {}
  };
}
