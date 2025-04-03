import type { PublishCommandOutput } from '@aws-sdk/client-sns';
import { ParsingError } from '@model/Errors';
import type { ServiceResponse } from '@model/ServiceResponse';
import type { CalendarEvent, DateTime, RCSSenderId, TimeZone } from '@notifycal/shared/types';
import type { AwsArn, PhoneNumberE164 } from '@own-types/model';
import { eventsStartTimeWithin } from '@services/calendar-events';
import { phoneNumberByEmail } from '@services/contacts';
import { SnsService } from '@services/sns';
import { userCalendarFetchedEvent } from '@testing/data/app-events';
import { validRecord } from '@testing/data/sqs-events';
import { fakeIdpConfigs } from '@testing/utils/config';
import { describe, expect, it, vi } from 'vitest';
import type { ActionableEventsConfig } from './config';
import { recordProcessor } from './record-processor';
import type { Record } from './schema';

const defaultConfig: ActionableEventsConfig = {
  actionableEventFoundTopicConfig: {
    topicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic' as AwsArn
  },
  idpConfigs: fakeIdpConfigs
};

const validCalendarEvent: CalendarEvent = {
  id: 'event-1',
  attendees: [{ id: 'attendee@test.com' }],
  isAllDayEvent: false,
  startTime: '2024-01-02T15:05:00Z' as DateTime,
  timeZone: 'Europe/Madrid' as TimeZone
};
const validEvents: Array<CalendarEvent> = [validCalendarEvent];

const validPhoneNumber = '+34666888999' as PhoneNumberE164;
const validRCSSenderId = 'Notifycal testing' as RCSSenderId;

describe('Find actionable events record processor', () => {
  it('should process an event successfully and publish to SNS', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve([validPhoneNumber]);
    const eventInRecord = userCalendarFetchedEvent;
    await testit(validRecord(eventInRecord), eventsStartTimeWithinFn, phoneNumberByEmailFn);

    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: eventInRecord.userId,
        idp: eventInRecord.idp,
        idpId: eventInRecord.idpId,
        correlationId: eventInRecord.correlationId,
        eventType: 'ActionableEventFound',
        data: {
          run: eventInRecord.data.run,
          calendar: eventInRecord.data.calendar,
          calendarEvent: validEvents[0],
          receiverDetails: {
            type: 'phone',
            phoneNumber: validPhoneNumber
          },
          senderDetails: {
            type: 'rcs',
            identifier: validRCSSenderId
          },
          message:
            'Dear customer, you have an appointment at SomeBusinessName on 02/01/2024 at 16:05, located at SomeBusinessAddress. If you cannot attend, please notify us in advance. Sent with Notifycal®'
        }
      })
    );
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
  });

  it('should process events with multiple attendees and publish to SNS for each', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
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
  });

  it('should process attendees with multiple phone numbers and publish to SNS using the first one', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [] });
    const phoneNumberByEmailFn = () =>
      Promise.resolve(['+34666888999' as PhoneNumberE164, '+34666111222' as PhoneNumberE164]);
    await testit(
      validRecord(userCalendarFetchedEvent),
      eventsStartTimeWithinFn,
      phoneNumberByEmailFn
    );

    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it('should finish processing sucessfully and send an event to audit trail if no valid events are found', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const safePublishSpy = vi.spyOn(SnsService.prototype, 'safePublish').mockResolvedValue();
    const eventsStartTimeWithinFn = () => Promise.resolve({ successList: [], failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve([]);
    await testit(
      validRecord(userCalendarFetchedEvent),
      eventsStartTimeWithinFn,
      phoneNumberByEmailFn
    );

    expect(publishSpy).not.toHaveBeenCalled();
    expect(safePublishSpy).toHaveBeenCalledOnce();
  });

  it('should finish processing sucessfully and send an event to audit trail if no attendees are found in calendar event', async () => {
    const validEventsWithNoAttendees: Array<CalendarEvent> = [
      { ...validCalendarEvent, attendees: [] }
    ];
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const safePublishSpy = vi.spyOn(SnsService.prototype, 'safePublish').mockResolvedValue();
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEventsWithNoAttendees, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve([]);
    await testit(
      validRecord(userCalendarFetchedEvent),
      eventsStartTimeWithinFn,
      phoneNumberByEmailFn
    );

    expect(publishSpy).not.toHaveBeenCalled();
    expect(safePublishSpy).toHaveBeenCalledOnce();
  });

  it('should throw an error if eventsStartTimeWithin fails. Retrying the whole record relying on idempotence', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const error = new Error('Boom!');
    const eventsStartTimeWithinFn = () => Promise.reject(error);
    const phoneNumberByEmailFn = () => Promise.resolve([validPhoneNumber]);

    await expect(
      testit(validRecord(userCalendarFetchedEvent), eventsStartTimeWithinFn, phoneNumberByEmailFn)
    ).rejects.toThrow(error);

    expect(publishSpy).not.toHaveBeenCalled();
  });

  it('should publish an error event if some or all fetched events could not be parsed and keep processing', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockResolvedValue({} as PublishCommandOutput);
    const error = new ParsingError(`Booom!`, { something: null });
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [error] });
    const phoneNumberByEmailFn = () => Promise.resolve([validPhoneNumber]);
    const record = validRecord(userCalendarFetchedEvent);
    await testit(record, eventsStartTimeWithinFn, phoneNumberByEmailFn);

    expect(publishSpy).toHaveBeenCalledTimes(2);
    expect(publishSpy).toHaveBeenCalledWith(
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
    const safePublishSpy = vi.spyOn(SnsService.prototype, 'safePublish').mockResolvedValue();
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve([]);
    const record = validRecord(userCalendarFetchedEvent);
    await testit(record, eventsStartTimeWithinFn, phoneNumberByEmailFn);

    expect(publishSpy).not.toHaveBeenCalled();
    expect(safePublishSpy).toHaveBeenCalledWith(
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
    const error = new Error('Booom!');
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.reject(error);

    await expect(
      testit(validRecord(userCalendarFetchedEvent), eventsStartTimeWithinFn, phoneNumberByEmailFn)
    ).rejects.toThrow(
      'There were 1 failures to fetch all atteendee phone number for every calendar event. Successes: 0. Total: 1. All results:'
    );

    expect(publishSpy).not.toHaveBeenCalled();
  });

  it('should throw an error if publish fails. Retrying the whole record relying on idempotence', async () => {
    const publishSpy = vi
      .spyOn(SnsService.prototype, 'publish')
      .mockRejectedValue(new Error('SNS Error'));
    const eventsStartTimeWithinFn = () =>
      Promise.resolve({ successList: validEvents, failureList: [] });
    const phoneNumberByEmailFn = () => Promise.resolve([validPhoneNumber]);

    await expect(
      testit(validRecord(userCalendarFetchedEvent), eventsStartTimeWithinFn, phoneNumberByEmailFn)
    ).rejects.toThrow(
      'There were 1 failures to publish actionable events. Successes: 0. Total: 1. All results:'
    );

    expect(publishSpy).toHaveBeenCalledTimes(1);
  });
});

function testit(
  record: Record,
  getEventsFn: () => Promise<ServiceResponse<CalendarEvent, ParsingError>>,
  getPhoneNumbersFn: () => Promise<Array<PhoneNumberE164>>,
  config: ActionableEventsConfig = defaultConfig
): Promise<void> {
  vi.mock('@services/calendar-events');
  vi.mock('@services/contacts');

  vi.mocked(eventsStartTimeWithin).mockImplementation(getEventsFn);
  vi.mocked(phoneNumberByEmail).mockImplementation(getPhoneNumbersFn);

  return recordProcessor(record, config);
}
