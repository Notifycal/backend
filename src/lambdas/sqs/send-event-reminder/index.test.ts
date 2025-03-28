import * as makeIdempotentModule from '@aws-lambda-powertools/idempotency';
import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import { metrics } from '@common/powertools';
import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type {
  CalendarId,
  CalendarName,
  CorrelationId,
  DateTime,
  EventId,
  IdpId,
  TimeZone,
  UserId,
  Uuid
} from '@notifycal/shared/types';
import type { PhoneNumberE164, Url } from '@own-types/model';
import { AuditTrailService } from '@services/audit-trail';
import type { VonageApplicationId } from '@services/messaging';
import { validRawRecord as _validRawRecord } from '@testing/data/sqs-events';
import {
  setEnvAuditTrailQueueConfig,
  setEnvIdempotencyPersistanceConfig,
  setEnvVonageConfig
} from '@testing/utils/config';
import type { Context, SQSEvent, SQSRecord } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { handler, type Event } from '.';
import type { SendEventReminderConfig } from './config';
import MessageProcessor from './message-idempotent-processor';

vi.mock('@common/powertools');
vi.mock('./message-idempotent-processor');
vi.mock('@services/audit-trail');
vi.mock('@aws-lambda-powertools/parameters/ssm');
vi.mock('@aws-lambda-powertools/idempotency');
vi.mock('@aws-lambda-powertools/metrics');

const validActionableEventEvent: ActionableEventFoundEvent = {
  data: {
    receiverDetails: { type: 'phone', phoneNumber: '+34123456789' as PhoneNumberE164 },
    run: {
      lowerBoundStartTime: '2023-01-01T00:00:00Z' as DateTime,
      upperBoundStartTime: '2023-01-01T00:29:59Z' as DateTime,
      slidingWindowInMinutes: 30
    },
    calendar: {
      id: 'some calendar id' as CalendarId,
      name: 'some calendar name' as CalendarName
    },
    calendarEvent: {
      id: 'event-1',
      attendees: [{ id: 'attendee@test.com' }],
      isAllDayEvent: false,
      startTime: '2024-01-02T15:05:00Z' as DateTime,
      timeZone: 'Europe/Madrid' as TimeZone
    },
    senderDetails: { type: 'phone', phoneNumber: '+34666999888' as PhoneNumberE164 },
    message: `This is some message`
  },
  correlationId: '0de651ef-535e-4d2e-b9ff-7bf43f5aaaaa' as CorrelationId,
  eventId: '0de651ef-535e-4d2e-b9ff-7bf43f5a01ac' as EventId,
  userId: '0de651ef-535e-4d2e-b9ff-7bf43f5a0000' as UserId,
  idp: 'google.com',
  idpId: '45346356356' as IdpId,
  eventType: 'ActionableEventFound',
  happenedAt: '2024-01-02T15:04:50Z' as DateTime
};
const validRawRecord: SQSRecord = _validRawRecord(validActionableEventEvent);
const validEvent: SQSEvent = {
  Records: [validRawRecord]
};

const nonSpanishReceiverActionableEventEvent: ActionableEventFoundEvent = {
  ...validActionableEventEvent,
  data: {
    ...validActionableEventEvent.data,
    receiverDetails: { type: 'phone', phoneNumber: '+44123456789' as PhoneNumberE164 }
  }
};
const nonSpanishPhoneRecord: SQSRecord = _validRawRecord(nonSpanishReceiverActionableEventEvent);
const nonSpanishEvent: SQSEvent = {
  Records: [nonSpanishPhoneRecord]
};

describe('Send event reminder', () => {
  it('should process and return message UUID if successful', async () => {
    const returnedReminderId = 'mock-uuid' as Uuid;

    const sendReminderSpy = vi
      .spyOn(MessageProcessor.prototype, 'sendReminder')
      .mockResolvedValue(returnedReminderId);
    const auditTrailSpy = vi.fn().mockResolvedValue({ $metadata: {} });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(AuditTrailService.withConfig).mockReturnValue({
      send: auditTrailSpy
    } as unknown as AuditTrailService);
    const makeIdempotentSpy = vi
      .spyOn(makeIdempotentModule, 'makeIdempotent')
      .mockImplementation(() => sendReminderSpy.getMockImplementation()!);
    const onIdempotencyHitSpy = vi
      .spyOn(MessageProcessor.prototype, 'onIdempotencyHit')
      .mockResolvedValue(undefined);

    const result = await testit(validEvent);

    expect(result).toStrictEqual(returnedReminderId);
    expect(auditTrailSpy).toHaveBeenCalledTimes(0);
    expect(makeIdempotentSpy).toHaveBeenCalledTimes(1);
    expect(onIdempotencyHitSpy).toHaveBeenCalledTimes(0);
  });

  it('should return "MessageNotSentOutsideOfSpain" for non-Spanish phone numbers', async () => {
    const sendReminderSpy = vi.spyOn(MessageProcessor.prototype, 'sendReminder');
    const auditTrailSpy = vi.fn().mockResolvedValue({ $metadata: {} });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(AuditTrailService.withConfig).mockReturnValue({
      send: auditTrailSpy
    } as unknown as AuditTrailService);
    const makeIdempotentSpy = vi.spyOn(makeIdempotentModule, 'makeIdempotent');
    const onIdempotencyHitSpy = vi.spyOn(MessageProcessor.prototype, 'onIdempotencyHit');

    const result = await testit(nonSpanishEvent);

    expect(result).toBe('MessageNotSentOutsideOfSpain');
    expect(sendReminderSpy).toHaveBeenCalledTimes(0);
    expect(auditTrailSpy).toHaveBeenCalledTimes(0);
    expect(makeIdempotentSpy).toHaveBeenCalledTimes(0);
    expect(onIdempotencyHitSpy).toHaveBeenCalledTimes(0);
  });

  it('should call audit trail service when message sending fails', async () => {
    const error = new Error('Failed to send message');
    const sendReminderSpy = vi
      .spyOn(MessageProcessor.prototype, 'sendReminder')
      .mockRejectedValue(error);

    const auditTrailSpy = vi.fn().mockResolvedValue({ $metadata: {} });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(AuditTrailService.withConfig).mockReturnValue({
      send: auditTrailSpy
    } as unknown as AuditTrailService);
    vi.spyOn(makeIdempotentModule, 'makeIdempotent').mockImplementation(
      () => sendReminderSpy.getMockImplementation()!
    );

    await expect(testit(validEvent)).rejects.toThrow(error);

    expect(auditTrailSpy).toHaveBeenCalledTimes(1);
    expect(auditTrailSpy).toHaveBeenCalledWith({
      ...validActionableEventEvent,
      eventType: 'ActionableEventReminderAttemptFailed'
    });
  });

  it.todo('should call onIdempotencyHit when idempotency is hit - cannot be unit tested');

  it('should throw error when idempotency key is missing', async () => {
    const error = new Error('No idempotency key found in the request');
    vi.spyOn(makeIdempotentModule, 'makeIdempotent').mockImplementation(() => {
      throw error;
    });

    await expect(testit(validEvent)).rejects.toThrow(error);
  });

  it('should log appropriate metrics for non-Spanish numbers', async () => {
    const addMetricSpy = vi.spyOn(metrics, 'addMetric');
    const addMetadataSpy = vi.spyOn(metrics, 'addMetadata');

    await testit(nonSpanishEvent);

    expect(addMetricSpy).toHaveBeenCalledWith('MessageNotSentOutsideOfSpain', 'Count', 1);
    expect(addMetadataSpy).toHaveBeenCalledWith(
      'correlationId',
      nonSpanishReceiverActionableEventEvent.correlationId
    );
    expect(addMetadataSpy).toHaveBeenCalledWith(
      'eventId',
      nonSpanishReceiverActionableEventEvent.eventId
    );
  });
});

type EndpointConfig = Omit<SendEventReminderConfig, 'vonageConfig'> & {
  vonageConfig: Omit<SendEventReminderConfig['vonageConfig'], 'privateKey'>;
};

function testit(
  event: SQSEvent,
  getParameterFromSsmFn: () => Promise<string> = () => Promise.resolve('fakePrivateKey'),
  config: EndpointConfig = defaultConfig
): Promise<Uuid | 'MessageNotSentOutsideOfSpain'> {
  setEnv(config);
  vi.mocked(getParameter).mockImplementation(getParameterFromSsmFn);
  return handler(event as unknown as Event, {} as Context);
}

const defaultConfig: EndpointConfig = {
  vonageConfig: {
    applicationId: 'some app id' as VonageApplicationId,
    webhookBaseURL: 'https://test.com' as Url,
    privateKeySSMPath: 'some path'
  },
  idempotencyPersistenceConfig: {
    tableName: 'some table name',
    keyAttr: 'some key attr',
    expiryAttr: 'some expiryAttr',
    inProgressExpiryAttr: 'some in progress expiryAttr',
    statusAttr: 'some status Attr',
    dataAttr: 'some data attr',
    validationKeyAttr: 'some validation key attr'
  },
  auditTrailQueueConfig: {
    queueUrl: 'some queue url' as Url
  }
};

function setEnv(config: EndpointConfig): void {
  setEnvVonageConfig(config.vonageConfig);
  setEnvAuditTrailQueueConfig(config.auditTrailQueueConfig);
  setEnvIdempotencyPersistanceConfig(config);
}
