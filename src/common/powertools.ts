import { PT_VERSION as version } from '@aws-lambda-powertools/commons';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';

const defaultValues = {
  app_version: process.env.APP_VERSION || 'N/A',
  aws_region: process.env.AWS_REGION || 'eu-west-1'
};

const logger = new Logger({
  // TODO: https://docs.powertools.aws.dev/lambda/typescript/latest/core/logger/#sampling-debug-logs
  // sampleRateValue: 0,
  persistentLogAttributes: {
    ...defaultValues,
    logger: {
      name: '@aws-lambda-powertools/logger',
      version
    }
  }
});

const metrics = new Metrics({
  defaultDimensions: {
    ...defaultValues,
    environment: process.env.ENVIRONMENT || 'N/A',
    app_name: 'notifycal-backend',
    runtime: process.env.AWS_EXECUTION_ENV || 'N/A'
  },
  //TODO
  namespace: 'to_avoid_warnings'
});

const tracer = new Tracer();

export { logger, metrics, tracer };
