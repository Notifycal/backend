import type { ServiceResponse } from '@model/ServiceResponse';
import type {
  BusinessAddress,
  BusinessName,
  CalendarEvent,
  CalendarId,
  CalendarName,
  CorrelationId,
  DateTime,
  EventId,
  IdpId,
  PhoneNumber,
  TemplateId,
  UserId
} from '@notifycal/shared/types';
import type { AwsArn } from '@own-types/model';
import { eventsStartTimeWithin } from '@services/calendar-events';
import { phoneNumberByEmail } from '@services/contacts';
import { SnsService } from '@services/sns';
import { describe, expect, it, vi } from 'vitest';
import type { ActionableEventsConfig } from './config';
import * as dlq from './dlq';
import type { Record } from './index';
import { recordProcessor } from './record-processor';

const validRecord: Record = {
  body: {
    eventId: 'some-event-id' as EventId,
    eventType: 'UserCalendarFetched',
    happenedAt: '2024-01-01T10:00:00Z' as DateTime,
    correlationId: 'test-correlation-id' as CorrelationId,
    userId: 'test-user-id' as UserId,
    idp: 'google.com',
    idpId: 'test-idp-id' as IdpId,
    data: {
      run: {
        lowerBoundStartTime: '2024-01-02T10:00:00Z' as DateTime,
        upperBoundStartTime: '2024-01-02T10:29:59Z' as DateTime
      },
      calendar: {
        id: 'test-calendar-id' as CalendarId,
        name: 'Test Calendar' as CalendarName
      },
      template: {
        id: 'sometemplate id' as TemplateId,
        fields: {
          business: {
            name: 'Test Business' as BusinessName,
            address: '123 Test Street' as BusinessAddress
          }
        }
      }
    },
    sensitiveData: {
      idpAuthorization: {
        refreshToken: 'some-refresh-token'
      }
    }
  },
  messageId: 'some message id',
  receiptHandle: '',
  attributes: {
    ApproximateReceiveCount: '',
    ApproximateFirstReceiveTimestamp: '',
    SenderId: '',
    SentTimestamp: '',
    SequenceNumber: undefined,
    MessageDeduplicationId: undefined,
    MessageGroupId: undefined,
    AWSTraceHeader: undefined,
    DeadLetterQueueSourceArn: undefined
  },
  messageAttributes: {},
  md5OfBody: '',
  eventSource: 'aws:sqs',
  eventSourceARN: '',
  awsRegion: ''
};

const defaultConfig: ActionableEventsConfig = {
  actionableEventFoundTopicConfig: {
    topicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic' as AwsArn
  },
  idpConfigs: {
    'google.com': {
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
      redirectUri: 'mock-redirect-uri'
    }
  }
};

const validEvents: Array<CalendarEvent> = [
  {
    id: 'event-1',
    attendees: [{ id: 'attendee@test.com' }],
    isAllDayEvent: false,
    startTime: '' as DateTime
  }
];

describe('Find actionable events record processor', () => {
  it('should process an event successfully and publish to SNS', async () => {
    const publishEventSpy = vi.spyOn(SnsService.prototype, 'publishEvent');
    const publishToDlqSpy = vi.spyOn(dlq, 'publishToDlq').mockResolvedValue();
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve(['+34666888999' as PhoneNumber]);
    await testit(validRecord, eventsStartTimeWithinFn, phoneNumberByEmailFn);

    expect(publishEventSpy).toHaveBeenCalledTimes(1);
    expect(publishToDlqSpy).not.toHaveBeenCalled();
    expect(eventsStartTimeWithin).toHaveBeenCalledTimes(1);
    expect(phoneNumberByEmail).toHaveBeenCalledWith(
      'attendee@test.com',
      validRecord.body.sensitiveData.idpAuthorization,
      validRecord.body.idp,
      defaultConfig.idpConfigs
    );
  });

  it('should process multiple events and publish to SNS for each', async () => {
    const publishEventSpy = vi.spyOn(SnsService.prototype, 'publishEvent');
    const publishToDlqSpy = vi.spyOn(dlq, 'publishToDlq').mockResolvedValue();
    const multipleEvents: Array<CalendarEvent> = [
      {
        id: 'event-1',
        attendees: [{ id: 'attendee1@test.com' }],
        isAllDayEvent: false,
        startTime: '2024-01-02T10:29:59Z' as DateTime
      },
      {
        id: 'event-2',
        attendees: [{ id: 'attendee2@test.com' }],
        isAllDayEvent: false,
        startTime: '2024-01-02T10:29:59Z' as DateTime
      }
    ];
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: multipleEvents, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve(['+34666888999' as PhoneNumber]);
    await testit(validRecord, eventsStartTimeWithinFn, phoneNumberByEmailFn);

    expect(publishEventSpy).toHaveBeenCalledTimes(2);
    expect(publishToDlqSpy).not.toHaveBeenCalled();
  });

  it('should process events with multiple attendees and publish to SNS for each', async () => {
    const publishEventSpy = vi.spyOn(SnsService.prototype, 'publishEvent');
    const publishToDlqSpy = vi.spyOn(dlq, 'publishToDlq').mockResolvedValue();
    const eventWithMultipleAttendees = [
      {
        id: 'event-1',
        attendees: [{ id: 'attendee1@test.com' }, { id: 'attendee2@test.com' }],
        isAllDayEvent: false,
        startTime: '2024-01-02T10:29:59Z' as DateTime
      }
    ];
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: eventWithMultipleAttendees, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve(['+34666888999' as PhoneNumber]);
    await testit(validRecord, eventsStartTimeWithinFn, phoneNumberByEmailFn);

    expect(publishEventSpy).toHaveBeenCalledTimes(2);
    expect(publishToDlqSpy).not.toHaveBeenCalled();
  });

  it('should process attendees with multiple phone numbers and publish to SNS using the first one', async () => {
    const publishEventSpy = vi.spyOn(SnsService.prototype, 'publishEvent');
    const publishToDlqSpy = vi.spyOn(dlq, 'publishToDlq').mockResolvedValue();
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [] });
    const phoneNumberByEmailFn = () =>
      Promise.resolve(['+34666888999' as PhoneNumber, '+34666111222' as PhoneNumber]);
    await testit(validRecord, eventsStartTimeWithinFn, phoneNumberByEmailFn);

    expect(publishEventSpy).toHaveBeenCalledTimes(1);
    expect(publishToDlqSpy).not.toHaveBeenCalled();
  });

  it('should not publish if no valid events are found', async () => {
    const publishEventSpy = vi.spyOn(SnsService.prototype, 'publishEvent');
    const publishToDlqSpy = vi.spyOn(dlq, 'publishToDlq').mockResolvedValue();
    const eventsStartTimeWithinFn = () => Promise.resolve({ successList: [], failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve([]);
    await testit(validRecord, eventsStartTimeWithinFn, phoneNumberByEmailFn);

    expect(publishEventSpy).not.toHaveBeenCalled();
    expect(publishToDlqSpy).not.toHaveBeenCalled();
  });

  it('should not publish if eventsStartTimeWithin fails', async () => {
    const publishEventSpy = vi.spyOn(SnsService.prototype, 'publishEvent');
    const publishToDlqSpy = vi.spyOn(dlq, 'publishToDlq').mockResolvedValue();
    const eventsStartTimeWithinFn = () => Promise.reject(new Error('Boom!'));
    const phoneNumberByEmailFn = () => Promise.resolve(['+34666888999' as PhoneNumber]);

    await expect(
      testit(validRecord, eventsStartTimeWithinFn, phoneNumberByEmailFn)
    ).rejects.toThrow('Boom!');

    expect(publishEventSpy).not.toHaveBeenCalled();
    expect(publishToDlqSpy).not.toHaveBeenCalled();
  });

  it('should publish to DLQ if fetched events could not be parsed', async () => {
    const publishEventSpy = vi.spyOn(SnsService.prototype, 'publishEvent');
    const publishToDlqSpy = vi.spyOn(dlq, 'publishToDlq').mockResolvedValue();
    const error = new Error(`Booom!`);
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: [], failureList: [error] });
    const phoneNumberByEmailFn = () => Promise.resolve([]);
    await testit(validRecord, eventsStartTimeWithinFn, phoneNumberByEmailFn);

    expect(publishEventSpy).not.toHaveBeenCalled();
    expect(publishToDlqSpy).toHaveBeenCalledWith(error);
  });

  it('should publish to DLQ if no phone number for an attendee', async () => {
    const publishEventSpy = vi.spyOn(SnsService.prototype, 'publishEvent');
    const publishToDlqSpy = vi.spyOn(dlq, 'publishToDlq').mockResolvedValue();
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve([]);
    await testit(validRecord, eventsStartTimeWithinFn, phoneNumberByEmailFn);

    expect(publishEventSpy).not.toHaveBeenCalled();
    expect(publishToDlqSpy).toHaveBeenCalledWith(
      new Error(`No phone number on some calendar event attendee`)
    );
  });

  it('should throw an error if publishEvent fails', async () => {
    const publishEventSpy = vi
      .spyOn(SnsService.prototype, 'publishEvent')
      .mockRejectedValue(new Error('SNS Error'));
    const publishToDlqSpy = vi.spyOn(dlq, 'publishToDlq').mockResolvedValue();
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve(['+34666888999' as PhoneNumber]);

    await expect(
      testit(validRecord, eventsStartTimeWithinFn, phoneNumberByEmailFn)
    ).rejects.toThrow('SNS Error');

    expect(publishEventSpy).toHaveBeenCalledTimes(1);
    expect(publishToDlqSpy).not.toHaveBeenCalled();
  });
});

function testit(
  record: Record,
  getEventsFn: () => Promise<ServiceResponse<CalendarEvent>>,
  getPhoneNumbersFn: () => Promise<Array<PhoneNumber>>,
  config: ActionableEventsConfig = defaultConfig
): Promise<void> {
  vi.mock('@services/calendar-events');
  vi.mock('@services/contacts');

  vi.mocked(eventsStartTimeWithin).mockImplementation(getEventsFn);
  vi.mocked(phoneNumberByEmail).mockImplementation(getPhoneNumbersFn);

  return recordProcessor(record, config);
}
