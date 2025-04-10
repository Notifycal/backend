import type { MiddlewareObj } from '@middy/core';
import { metrics } from './powertools';

export function flushMetricsMiddleware(): MiddlewareObj {
  const publish = (): void => {
    metrics.publishAll();
  };

  return {
    after: publish,
    onError: publish
  };
}
