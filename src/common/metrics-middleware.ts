import type { ExtraOptions } from '@aws-lambda-powertools/metrics/types';
import type { MiddlewareObj } from '@middy/core';
import type MetricsAggregator from '@utils/MetricsAggregator';

import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { LambdaUtility } from '@utils/LambdaUtility';

const utility = new LambdaUtility();

const COLD_START_METRIC = 'ColdStart';

export function metricsMiddleware(
  target: MetricsAggregator,
  options: Pick<ExtraOptions, 'captureColdStartMetric'> = {}
): MiddlewareObj {
  const captureLambdaColdStartMetric = (): void => {
    if (!utility.getColdStart()) {
      return;
    }

    target.addMetric(COLD_START_METRIC, MetricUnit.Count, 1);
  };

  const publish = (): void => {
    target.publishAll();
  };

  const before = (): void => {
    const { captureColdStartMetric } = options;
    if (captureColdStartMetric) {
      captureLambdaColdStartMetric();
    }
  };

  return {
    before,
    after: publish,
    onError: publish
  };
}
