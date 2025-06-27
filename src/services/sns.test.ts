import { SNSClient, type PublishCommandOutput } from '@aws-sdk/client-sns';
import { logger } from '@common/powertools';
import type { SnsTopicConfig } from '@model/Config';
import type { AwsArn } from '@own-types/model';
import { userCalendarFetchedEvent } from '@testing/data/app-events';
import { v4 } from 'uuid';
import { describe, expect, it, vi, type MockInstance } from 'vitest';
import type { UserCalendarFetchedEvent } from '../model/app-events/UserCalendarFetchedEvent';
import { SnsService } from './sns';

const validEvent = userCalendarFetchedEvent;

describe('SnsService.publish', () => {
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
    const expectedErrorMsg = `Error publishing an event to SNS`;

    await expect(testit(validEvent)).rejects.toThrow(expectedErrorMsg);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(expectedErrorMsg, {
      '0': { eventId: validEvent.eventId },
      error: snsSendResponse
    });
  });
});

function testit(event: UserCalendarFetchedEvent) {
  const config: SnsTopicConfig = {
    topicArn: 'arn:aws:sns:us-east-1:123456789012:MyTopic' as AwsArn
  };
  const snsService = SnsService.withConfig(config, logger);
  return snsService.publish(event);
}
