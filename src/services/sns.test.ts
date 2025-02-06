import { SNSClient, type PublishCommandOutput } from '@aws-sdk/client-sns';
import { logger } from '@common/powertools';
import type { SnsTopicConfig } from '@model/Config';
import type {
  BusinessAddress,
  BusinessName,
  CalendarId,
  CalendarName,
  CorrelationId,
  DateTime,
  EventId,
  IdpId,
  TemplateId,
  UserId
} from '@notifycal/shared/types';
import type { AwsArn } from '@own-types/model';
import { v4 } from 'uuid';
import { describe, expect, it, vi, type MockInstance } from 'vitest';
import type { UserCalendarFetchedEvent } from '../model/app-events/UserCalendarFetchedEvent';
import { SnsService } from './sns';

const validEvent: UserCalendarFetchedEvent = {
  eventId: 'event123' as EventId,
  correlationId: 'event123' as CorrelationId,
  eventType: 'UserCalendarFetched',
  happenedAt: '2023-01-01T00:00:00Z' as DateTime,
  userId: 'user123' as UserId,
  idp: 'google.com',
  idpId: 'google-123' as IdpId,
  data: {
    calendar: {
      id: 'someCalendarId' as CalendarId,
      name: 'Some Calendar Name' as CalendarName
    },
    template: {
      id: 'some-template-id' as TemplateId,
      fields: {
        business: {
          name: 'SomeBusinessName' as BusinessName,
          address: 'SomeBusinessAddress' as BusinessAddress
        }
      }
    }
  },
  sensitiveData: {
    idpAuthorization: {
      refreshToken: 'some refresh token'
    }
  }
};

describe('SnsService.publishEvent', () => {
  it('should publish the event successfully and log the result', async () => {
    const snsSendResponse: PublishCommandOutput = {
      $metadata: {},
      MessageId: v4()
    };
    const spy: MockInstance<() => Promise<PublishCommandOutput>> = vi.spyOn(
      SNSClient.prototype,
      'send'
    );
    spy.mockResolvedValue(snsSendResponse);
    const result = await testit(validEvent);

    expect(result).toStrictEqual(snsSendResponse);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should handle SNS publishing errors gracefully', async () => {
    const snsSendResponse = new Error('Booom!');
    const spy: MockInstance<() => Promise<PublishCommandOutput>> = vi.spyOn(
      SNSClient.prototype,
      'send'
    );
    spy.mockRejectedValue(snsSendResponse);
    const loggerErrorSpy = vi.spyOn(logger, 'error').mockReturnValue();
    const loggerInfoSpy = vi.spyOn(logger, 'info').mockReturnValue();
    const result = await testit(validEvent);

    expect(result).toStrictEqual({});
    expect(spy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith('Error publishing an event to SNS. Error: Booom!');
    expect(loggerInfoSpy).toHaveBeenCalledWith('Moving on after error...');
  });
});

function testit(event: UserCalendarFetchedEvent) {
  const config: SnsTopicConfig = {
    topicArn: 'arn:aws:sns:us-east-1:123456789012:MyTopic' as AwsArn
  };
  const snsService = SnsService.withConfig(config);
  return snsService.publishEvent(event);
}
