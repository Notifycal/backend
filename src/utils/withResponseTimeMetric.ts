import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { logger, metrics } from '@common/powertools';

export async function withResponseTimeMetric<T>(
  metricLabel: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  try {
    return await fn();
  } finally {
    const duration = Date.now() - start;

    logger.info(`${metricLabel}ResponseTime: ${duration} ms`);
    metrics.addMetric(`${metricLabel}ResponseTime`, MetricUnit.Milliseconds, duration);
  }
}
