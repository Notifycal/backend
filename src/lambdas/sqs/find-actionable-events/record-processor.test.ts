import type { PublishCommandOutput } from '@aws-sdk/client-sns';
import type { SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import { ParsingError } from '@model/Errors';
import type { ServiceResponse } from '@model/ServiceResponse';
import type { CalendarEvent, DateTime, PhoneNumber, TimeZone } from '@notifycal/shared/types';
import type { AwsArn, Url } from '@own-types/model';
import { eventsStartTimeWithin } from '@services/calendar-events';
import { phoneNumberByEmail } from '@services/contacts';
import { DeadLetteringService } from '@services/dead-lettering';
import { SnsService } from '@services/sns';
import { userCalendarFetchedEvent } from '@testing/data/app-events';
import { validRecord } from '@testing/data/sqs-events';
import { fakeIdpConfigs } from '@testing/utils/config';
import { describe, expect, it, vi } from 'vitest';
import type { ActionableEventsConfig } from './config';
import type { Record } from './index';
import { recordProcessor } from './record-processor';

const defaultConfig: ActionableEventsConfig = {
  actionableEventFoundTopicConfig: {
    topicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic' as AwsArn
  },
  deadLetterQueueConfig: {
    queueUrl: 'http://aws.com/dlq' as Url
  },
  idpConfigs: fakeIdpConfigs
};

const validEvents: Array<CalendarEvent> = [
  {
    id: 'event-1',
    attendees: [{ id: 'attendee@test.com' }],
    isAllDayEvent: false,
    startTime: '2024-01-02T15:05:00Z' as DateTime,
    timeZone: 'Europe/Madrid' as TimeZone
  }
];

const validPhoneNumber: PhoneNumber = '+34666888999' as PhoneNumber;

describe('Find actionable events record processor', () => {
  it('should process an event successfully and publish to SNS', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const dlqSpy = vi
      .spyOn(DeadLetteringService.prototype, 'send')
      .mockResolvedValue({} as SendMessageCommandOutput);
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve([validPhoneNumber]);
    const eventInRecord = userCalendarFetchedEvent;
    await testit(validRecord(eventInRecord), eventsStartTimeWithinFn, phoneNumberByEmailFn);

    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(dlqSpy).not.toHaveBeenCalled();
    expect(eventsStartTimeWithin).toHaveBeenCalledWith(
      eventInRecord.data.calendar.id,
      eventInRecord.data.run.lowerBoundStartTime,
      eventInRecord.data.run.upperBoundStartTime,
      false,
      eventInRecord.sensitiveData.idpAuthorization,
      eventInRecord.idp,
      defaultConfig.idpConfigs
    );
    expect(phoneNumberByEmail).toHaveBeenCalledWith(
      'attendee@test.com',
      eventInRecord.sensitiveData.idpAuthorization,
      eventInRecord.idp,
      defaultConfig.idpConfigs
    );
  });

  it('should include all day events if it is the 10 oclock run', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const dlqSpy = vi
      .spyOn(DeadLetteringService.prototype, 'send')
      .mockResolvedValue({} as SendMessageCommandOutput);
    const multipleEvents: Array<CalendarEvent> = [
      {
        id: 'event-1',
        attendees: [{ id: 'attendee1@test.com' }],
        isAllDayEvent: true,
        startTime: '2024-01-02T10:29:59.000Z' as DateTime,
        timeZone: 'Europe/Madrid' as TimeZone
      },
      {
        id: 'event-2',
        attendees: [{ id: 'attendee2@test.com' }],
        isAllDayEvent: false,
        startTime: '2024-01-02T10:29:59.000Z' as DateTime,
        timeZone: 'Europe/Madrid' as TimeZone
      }
    ];
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: multipleEvents, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve([validPhoneNumber]);
    const record = validRecord(userCalendarFetchedEvent);
    const validRecordAllDayEvents = {
      ...record,
      body: {
        ...record.body,
        data: {
          ...record.body.data,
          run: {
            lowerBoundStartTime: '2024-01-02T10:00:00.000Z' as DateTime,
            upperBoundStartTime: '2024-01-02T10:29:59.000Z' as DateTime,
            slidingWindowInMinutes: 30
          }
        }
      }
    };
    await testit(validRecordAllDayEvents, eventsStartTimeWithinFn, phoneNumberByEmailFn);
    const eventInRecord = validRecordAllDayEvents.body;

    expect(publishSpy).toHaveBeenCalledTimes(2);
    expect(dlqSpy).not.toHaveBeenCalled();
    expect(eventsStartTimeWithin).toHaveBeenCalledTimes(1);
    expect(eventsStartTimeWithin).toHaveBeenCalledWith(
      eventInRecord.data.calendar.id,
      eventInRecord.data.run.lowerBoundStartTime,
      eventInRecord.data.run.upperBoundStartTime,
      true,
      eventInRecord.sensitiveData.idpAuthorization,
      eventInRecord.idp,
      defaultConfig.idpConfigs
    );
  });

  it('should process multiple events and publish to SNS for each', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const dlqSpy = vi
      .spyOn(DeadLetteringService.prototype, 'send')
      .mockResolvedValue({} as SendMessageCommandOutput);
    const multipleEvents: Array<CalendarEvent> = [
      {
        id: 'event-1',
        attendees: [{ id: 'attendee1@test.com' }],
        isAllDayEvent: false,
        startTime: '2024-01-02T10:29:59Z' as DateTime,
        timeZone: 'Europe/Madrid' as TimeZone
      },
      {
        id: 'event-2',
        attendees: [{ id: 'attendee2@test.com' }],
        isAllDayEvent: false,
        startTime: '2024-01-02T10:29:59Z' as DateTime,
        timeZone: 'Europe/Madrid' as TimeZone
      }
    ];
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: multipleEvents, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve([validPhoneNumber]);
    await testit(
      validRecord(userCalendarFetchedEvent),
      eventsStartTimeWithinFn,
      phoneNumberByEmailFn
    );

    expect(publishSpy).toHaveBeenCalledTimes(2);
    expect(dlqSpy).not.toHaveBeenCalled();
  });

  it('should process events with multiple attendees and publish to SNS for each', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const dlqSpy = vi
      .spyOn(DeadLetteringService.prototype, 'send')
      .mockResolvedValue({} as SendMessageCommandOutput);
    const eventWithMultipleAttendees = [
      {
        id: 'event-1',
        attendees: [{ id: 'attendee1@test.com' }, { id: 'attendee2@test.com' }],
        isAllDayEvent: false,
        startTime: '2024-01-02T10:29:59Z' as DateTime,
        timeZone: 'Europe/Madrid' as TimeZone
      }
    ];
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: eventWithMultipleAttendees, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve([validPhoneNumber]);
    await testit(
      validRecord(userCalendarFetchedEvent),
      eventsStartTimeWithinFn,
      phoneNumberByEmailFn
    );

    expect(publishSpy).toHaveBeenCalledTimes(2);
    expect(dlqSpy).not.toHaveBeenCalled();
  });

  it('should process attendees with multiple phone numbers and publish to SNS using the first one', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const dlqSpy = vi
      .spyOn(DeadLetteringService.prototype, 'send')
      .mockResolvedValue({} as SendMessageCommandOutput);
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [] });
    const phoneNumberByEmailFn = () =>
      Promise.resolve(['+34666888999' as PhoneNumber, '+34666111222' as PhoneNumber]);
    await testit(
      validRecord(userCalendarFetchedEvent),
      eventsStartTimeWithinFn,
      phoneNumberByEmailFn
    );

    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(dlqSpy).not.toHaveBeenCalled();
  });

  it('should finish processing sucessfully if no valid events are found', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const dlqSpy = vi
      .spyOn(DeadLetteringService.prototype, 'send')
      .mockResolvedValue({} as SendMessageCommandOutput);
    const eventsStartTimeWithinFn = () => Promise.resolve({ successList: [], failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve([]);
    await testit(
      validRecord(userCalendarFetchedEvent),
      eventsStartTimeWithinFn,
      phoneNumberByEmailFn
    );

    expect(publishSpy).not.toHaveBeenCalled();
    expect(dlqSpy).not.toHaveBeenCalled();
  });

  it('should throw an error if eventsStartTimeWithin fails. Retrying the whole record relying on idempotence', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const dlqSpy = vi
      .spyOn(DeadLetteringService.prototype, 'send')
      .mockResolvedValue({} as SendMessageCommandOutput);
    const error = new Error('Boom!');
    const eventsStartTimeWithinFn = () => Promise.reject(error);
    const phoneNumberByEmailFn = () => Promise.resolve([validPhoneNumber]);

    await expect(
      testit(validRecord(userCalendarFetchedEvent), eventsStartTimeWithinFn, phoneNumberByEmailFn)
    ).rejects.toThrow(error);

    expect(publishSpy).not.toHaveBeenCalled();
    expect(dlqSpy).not.toHaveBeenCalled();
  });

  it('should publish to DLQ if some or all fetched events could not be parsed and keep processing', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const dlqSpy = vi
      .spyOn(DeadLetteringService.prototype, 'send')
      .mockResolvedValue({} as SendMessageCommandOutput);
    const error = new ParsingError(`Booom!`, { something: null });
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [error] });
    const phoneNumberByEmailFn = () => Promise.resolve([validPhoneNumber]);
    const record = validRecord(userCalendarFetchedEvent);
    await testit(record, eventsStartTimeWithinFn, phoneNumberByEmailFn);

    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(dlqSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: record.body.correlationId,
        userId: record.body.userId,
        idp: record.body.idp,
        idpId: record.body.idpId,
        data: {
          eventIdCause: record.body.eventId,
          run: record.body.data.run,
          calendar: record.body.data.calendar,
          error: {
            message: error.message,
            cause: error.item
          }
        }
      })
    );
  });

  it('should publish to DLQ if no phone number for an attendee and keep processing', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const dlqSpy = vi
      .spyOn(DeadLetteringService.prototype, 'send')
      .mockResolvedValue({} as SendMessageCommandOutput);
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve([]);
    const record = validRecord(userCalendarFetchedEvent);
    await testit(record, eventsStartTimeWithinFn, phoneNumberByEmailFn);

    expect(publishSpy).not.toHaveBeenCalled();
    expect(dlqSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: record.body.correlationId,
        userId: record.body.userId,
        idp: record.body.idp,
        idpId: record.body.idpId,
        data: {
          eventIdCause: record.body.eventId,
          run: record.body.data.run,
          calendar: record.body.data.calendar,
          calendarEvent: validEvents[0],
          attendeeId: validEvents[0].attendees[0].id
        }
      })
    );
  });

  it('should throw an error if phoneNumberByEmail fails. Retrying the whole record relying on idempotence', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const dlqSpy = vi
      .spyOn(DeadLetteringService.prototype, 'send')
      .mockResolvedValue({} as SendMessageCommandOutput);
    const error = new Error('Booom!');
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.reject(error);

    await expect(
      testit(validRecord(userCalendarFetchedEvent), eventsStartTimeWithinFn, phoneNumberByEmailFn)
    ).rejects.toThrow(
      'There were 1 failures to fetch all atteendee phone number for every calendar event. Successes: 0. Total: 1. All results: [{"status":"rejected","reason":{}}]'
    );

    expect(publishSpy).not.toHaveBeenCalled();
    expect(dlqSpy).not.toHaveBeenCalled();
  });

  it('should throw an error if publish fails. Retrying the whole record relying on idempotence', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockRejectedValue(new Error('SNS Error'));
    const dlqSpy = vi
      .spyOn(DeadLetteringService.prototype, 'send')
      .mockResolvedValue({} as SendMessageCommandOutput);
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve([validPhoneNumber]);

    await expect(
      testit(validRecord(userCalendarFetchedEvent), eventsStartTimeWithinFn, phoneNumberByEmailFn)
    ).rejects.toThrow(
      'There were 1 failures to publish actionable events. Successes: 0. Total: 1. All results: [{"status":"rejected","reason":{}}]'
    );

    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(dlqSpy).not.toHaveBeenCalled();
  });
});

function testit(
  record: Record,
  getEventsFn: () => Promise<ServiceResponse<CalendarEvent, ParsingError>>,
  getPhoneNumbersFn: () => Promise<Array<PhoneNumber>>,
  config: ActionableEventsConfig = defaultConfig
): Promise<void> {
  vi.mock('@services/calendar-events');
  vi.mock('@services/contacts');

  vi.mocked(eventsStartTimeWithin).mockImplementation(getEventsFn);
  vi.mocked(phoneNumberByEmail).mockImplementation(getPhoneNumbersFn);

  return recordProcessor(record, config);
}
