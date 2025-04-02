import { PT_VERSION as version } from '@aws-lambda-powertools/commons';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';
import type { EventType } from '@model/app-events/BaseEvent';
import type { CorrelationId, DateTime, EventId } from '@notifycal/shared/types';

const environment = process.env.ENVIRONMENT || 'N/A';
const serviceName = 'notifycal-backend';
const metricsNamespace = `${serviceName}-${environment}`;

const defaultValues = {
  appVersion: process.env.APP_VERSION || 'N/A',
  awsRegion: process.env.AWS_REGION || 'eu-west-1',
  environment
};

const logger = new Logger({
  // TODO: https://docs.powertools.aws.dev/lambda/typescript/latest/core/logger/#sampling-debug-logs
  // sampleRateValue: 0,
  serviceName,
  persistentLogAttributes: {
    ...defaultValues,
    logger: {
      name: '@aws-lambda-powertools/logger',
      version
    }
  }
});

const metrics = new Metrics({
  namespace: metricsNamespace,
  serviceName,
  defaultDimensions: {
    ...defaultValues,
    runtime: process.env.AWS_EXECUTION_ENV || 'N/A',
    // eslint-disable-next-line camelcase
    function_name: process.env.AWS_LAMBDA_FUNCTION_NAME || 'N/A'
  }
});

const tracer = new Tracer();

function withEventMetric(
  eventType: EventType,
  eventId: EventId,
  correlationId: CorrelationId,
  happenedAt?: DateTime
): void {
  try {
    metrics.addMetric(eventType, MetricUnit.Count, 1);
    metrics.addMetadata('eventId', eventId);
    metrics.addMetadata('correlationId', correlationId);
    if (happenedAt) {
      metrics.setTimestamp(new Date(happenedAt));
    }
  } catch (error) {
    logger.info('Could not add EventType Cloudwatch Metric.', {
      error,
      eventType,
      eventId,
      correlationId,
      happenedAt
    });
  }
}

export { logger, metrics, tracer, withEventMetric };
