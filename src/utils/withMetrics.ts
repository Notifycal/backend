import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { metrics } from '@common/powertools';

interface MetricDimensions {
  [key: string]: string;
}

export async function withMetrics<T>(
  metricLabel: string,
  fn: () => Promise<T>,
  dimensions: MetricDimensions = {}
): Promise<T> {
  for (const [key, value] of Object.entries(dimensions)) {
    metrics.addDimension(key, value);
  }

  const start = Date.now();

  try {
    const result = await fn();
    metrics.addMetric(`${metricLabel}Success`, MetricUnit.Count, 1);
    return result;
  } catch (error) {
    metrics.addMetric(`${metricLabel}Failure`, MetricUnit.Count, 1);
    throw error;
  } finally {
    const duration = Date.now() - start;

    metrics.addMetric(`${metricLabel}ResponseTime`, MetricUnit.Milliseconds, duration);
  }
}
