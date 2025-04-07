import { backgroundProcessingMiddleware } from '@common/lambda-middleware';
import { logger } from '@common/powertools';
import type { Uuid } from '@notifycal/shared/types';
import { AuditTrailService } from '@services/audit-trail';
import type { Context } from 'aws-lambda';
import { z } from 'zod';
import { readSendEventReminderConfig } from './config';

const eventSchema = z.object({}).passthrough();
export type Event = z.infer<typeof eventSchema>;

// eslint-disable-next-line prefer-const
let ssmCache: { vonagePrivateKey?: string } = {};

async function lambdaHandler(
  event: Event,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: Context
): Promise<Uuid | 'MessageNotSentOutsideOfSpain'> {
  logger.info(`Processing sqs message in third lambda`, { event });

  const eventssss = [
    {
      id: 'fakeId-sergio-test',
      version: 'someVersion',
      account: 'someAccount',
      time: '2025-02-16T20:00:00.000Z',
      region: 'eu-west-1',
      resources: [],
      source: 'someSource',
      'detail-type': 'Scheduled event',
      detail: 'SomeDetails',
      'replay-name': 'Some replay name'
    },
    {
      eventId: 'c1625a78-7337-4fd8-a6c4-a0afb9c0ceb9',
      correlationId: 'c1625a78-7337-4fd8-a6c4-a0afb9c0ceb9',
      eventType: 'UserCalendarFetched',
      happenedAt: '2023-01-01T00:00:00Z',
      userId: '96f3d941-1155-4d50-ac5a-19345fb7e9ef',
      idp: 'google.com',
      idpId: 'google-123',
      data: {
        run: {
          lowerBoundStartTime: '2023-01-01T00:00:00Z',
          upperBoundStartTime: '2023-01-01T00:29:59Z',
          slidingWindowInMinutes: 30
        },
        senderDetails: {
          type: 'rcs',
          identifier: 'Notifycal testing'
        },
        calendar: {
          id: 'someCalendarId',
          name: 'Some Calendar Name'
        },
        template: {
          id: 'template-id',
          fields: {
            business: {
              name: 'SomeBusinessName',
              address: 'SomeBusinessAddress'
            }
          }
        }
      },
      sensitiveData: {
        idpAuthorization: {
          refreshToken: 'some refresh token'
        }
      }
    }
  ];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const auditTrailService = AuditTrailService.withConfig(event.lambdaConfig.auditTrailQueueConfig);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  await auditTrailService.sendBatch(eventssss as any);
  logger.info(`Finished test partial batch failure`);
  return Promise.resolve('MessageNotSentOutsideOfSpain');
}

export const handler = backgroundProcessingMiddleware(
  () => readSendEventReminderConfig(ssmCache),
  eventSchema
).handler<Event>(lambdaHandler);
