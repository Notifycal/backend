import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { metrics } from '@common/powertools';

interface MetricDimensions {
  [key: string]: string;
}

export async function withIntegrationMetrics<T>(
  vendor: string,
  operation: string,
  fn: () => Promise<T>,
  extraDimensions: MetricDimensions = {}
): Promise<T> {
  const INTEGRATION_LABEL_SUFFIX = 'IntegrationCall';
  const metricDimensions = {
    ...extraDimensions,
    vendor,
    operation
  };

  const start = Date.now();

  try {
    const result = await fn();
    metrics.addMetric(`${INTEGRATION_LABEL_SUFFIX}Success`, MetricUnit.Count, 1, metricDimensions);
    return result;
  } catch (error) {
    metrics.addMetric(`${INTEGRATION_LABEL_SUFFIX}Failure`, MetricUnit.Count, 1, metricDimensions);
    throw error;
  } finally {
    const duration = Date.now() - start;

    metrics.addMetric(
      `${INTEGRATION_LABEL_SUFFIX}ResponseTime`,
      MetricUnit.Milliseconds,
      duration,
      metricDimensions
    );
  }
}
