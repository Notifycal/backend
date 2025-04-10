import { PT_VERSION as version } from '@aws-lambda-powertools/commons';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import type { MetricsOptions } from '@aws-lambda-powertools/metrics/types';
import { Tracer } from '@aws-lambda-powertools/tracer';
import MetricsAggregator from '@utils/MetricsAggregator';

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

const metricsOptions: MetricsOptions = {
  namespace: metricsNamespace,
  serviceName,
  defaultDimensions: {
    ...defaultValues,
    runtime: process.env.AWS_EXECUTION_ENV || 'N/A',
    // eslint-disable-next-line camelcase
    function_name: process.env.AWS_LAMBDA_FUNCTION_NAME || 'N/A'
  }
};

const metrics = new MetricsAggregator(metricsOptions);

// const metrics2 = new Metrics(metricsOptions);

const tracer = new Tracer();

export { logger, metrics, tracer };
