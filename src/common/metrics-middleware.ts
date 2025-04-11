import type { ExtraOptions } from '@aws-lambda-powertools/metrics/types';
import type { MiddlewareObj } from '@middy/core';
import type MetricsAggregator from '@utils/MetricsAggregator';

import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { LambdaUtility } from '@utils/LambdaUtility';
import { logger } from './powertools';

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
    logger.info('Capturing cold start metric');
    target.addMetric(COLD_START_METRIC, MetricUnit.Count, 1);
  };

  const publish = (): void => {
    logger.info('Publishing metrics to CloudWatch');
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
