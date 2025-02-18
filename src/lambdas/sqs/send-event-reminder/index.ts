import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import { actionableEventFoundEventSchema } from '@model/app-events/ActionableEventFoundEvent';
import { eventSqsSchema } from '@model/lambda-events/SqsEvents';
import type { Uuid } from '@notifycal/shared/types';
import { MessagingService, type VonagePrivateKey } from '@services/messaging';
import type { Context } from 'aws-lambda';
import type { z } from 'zod';
import { readSendEventReminderConfig, type SendEventReminderConfig } from './config';

const eventSchema = eventSqsSchema<SendEventReminderConfig, typeof actionableEventFoundEventSchema>(
  actionableEventFoundEventSchema
);
export type Event = z.infer<typeof eventSchema>;

// eslint-disable-next-line prefer-const
let ssmParameterObj: { ssmParameter?: string } = {};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function lambdaHandler(event: Event, context: Context): Promise<Uuid | void> {
  logger.info(`Processing sqs message in third lambda. Event: ${JSON.stringify(event)}`);

  const vonagePrivateKey = (await getParameter(
    event.lambdaConfig.vonageConfig.privateKeySSMPath
  )) as VonagePrivateKey;

  const messenger = new MessagingService(
    event.lambdaConfig.vonageConfig.applicationId,
    vonagePrivateKey
  );
  console.log(messenger);
  // const eventBody = event.Records[0].body;

  // return messenger.sendMessage(
  //   eventBody.data.message,
  //   eventBody.data.senderDetails.number,
  //   eventBody.data.receiverDetails.number,
  //   eventBody.correlationId
  // );
  return Promise.resolve();
}

export const handler = backgroundProcessingMiddleware(
  () => readSendEventReminderConfig(ssmParameterObj),
  eventSchema
).handler<Event>(lambdaHandler);
