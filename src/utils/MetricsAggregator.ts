import { Metrics } from '@aws-lambda-powertools/metrics';
import type { MetricsOptions, MetricUnit } from '@aws-lambda-powertools/metrics/types';

interface MetricRecord {
  name: string;
  unit: MetricUnit;
  value: number;
  dimensions: Record<string, string>;
  metadata: Record<string, string>;
  timestamp: number | Date;
}

export default class MetricsAggregator {
  private readonly _metricRecords: Array<MetricRecord> = [];
  private readonly _metricOptions: MetricsOptions;

  public constructor(metricOptions: MetricsOptions) {
    this._metricOptions = metricOptions;
  }

  public addMetric(
    name: string,
    unit: MetricUnit,
    value: number,
    dimensions: Record<string, string> = {},
    metadata: Record<string, string> = {},
    timestamp: number | Date = Date.now()
  ): void {
    this._metricRecords.push({ name, unit, value, dimensions, metadata, timestamp });
  }

  public publishAll(): void {
    const ptMetrics = new Metrics(this._metricOptions);

    for (const metric of this._metricRecords) {
      ptMetrics.addDimensions(metric.dimensions);

      for (const metadata of Object.entries(metric.metadata)) {
        ptMetrics.addMetadata(...metadata);
      }

      ptMetrics.setTimestamp(metric.timestamp);
      ptMetrics.addMetric(metric.name, metric.unit, metric.value);
      // Isolate each record avoiding dimensions/metadata to be carried over
      ptMetrics.clearDimensions();
      ptMetrics.clearMetadata();
    }

    ptMetrics.publishStoredMetrics();
  }
}
