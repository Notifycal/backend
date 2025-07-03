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
  IdpName,
  TimeZone,
  UserId,
  Uuid
} from '@notifycal/shared/types';
import type { AwsArn, PhoneNumberE164, Url } from '@own-types/model';
import type { VonageApplicationId } from '@services/messaging';
import { UserBaseStore } from '@services/stores/user-base-store';
import { validRawRecord as _validRawRecord } from '@testing/data/sqs-events';
import {
  setEnvCreditServiceConfig,
  setEnvIdempotencyPersistanceConfig,
  setEnvMessagingTopicConfig,
  setEnvUserBaseStoreConfig,
  setEnvVonageConfig
} from '@testing/utils/config';
import type { Context, SQSEvent, SQSRecord } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import type { SendEventReminderConfig } from './config';
import { IdempotentProcessor } from './idempotent-processor';
import type { Event } from './index';

vi.mock('@common/powertools');
vi.mock('./idempotent-processor');
vi.mock('@aws-lambda-powertools/parameters/ssm');
vi.mock('@aws-lambda-powertools/metrics');
vi.mock('@services/stores/user-base-store');

const validActionableEventEvent: ActionableEventFoundEvent = {
  data: {
    receiverDetails: {
      type: 'phone',
      phoneNumber: '+34123456789' as PhoneNumberE164,
      countryCode: 'ES'
    },
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
    senderDetails: {
      type: 'phone',
      phoneNumber: '+34666999888' as PhoneNumberE164,
      countryCode: 'ES'
    },
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
    receiverDetails: {
      type: 'phone',
      phoneNumber: '+44123456789' as PhoneNumberE164,
      countryCode: 'GB'
    }
  }
};
const nonSpanishPhoneRecord: SQSRecord = _validRawRecord(nonSpanishReceiverActionableEventEvent);
const nonSpanishEvent: SQSEvent = {
  Records: [nonSpanishPhoneRecord]
};

describe('Send event reminder', () => {
  it('should process and return message UUID if successful', async () => {
    const returnedReminderId = 'mock-uuid' as Uuid;
    const sendReminderIdempotentlyFn = vi.fn().mockResolvedValue(returnedReminderId);

    const result = await testit(validEvent, sendReminderIdempotentlyFn);

    expect(result).toStrictEqual(returnedReminderId);
    expect(sendReminderIdempotentlyFn).toHaveBeenCalledWith(validActionableEventEvent);
  });

  it('should return "MessageNotSentOutsideOfSpain" for non-Spanish phone numbers', async () => {
    const sendReminderIdempotentlyFn = vi.fn();

    const result = await testit(nonSpanishEvent, sendReminderIdempotentlyFn);

    expect(result).toBe('MessageNotSentOutsideOfSpain');
    expect(sendReminderIdempotentlyFn).toHaveBeenCalledTimes(0);
  });

  it('should log appropriate metrics for non-Spanish numbers', async () => {
    const addMetricSpy = vi.spyOn(metrics, 'addMetric');

    await testit(nonSpanishEvent, vi.fn());

    expect(addMetricSpy).toHaveBeenCalledWith(
      'MessageNotSentOutsideOfSpain',
      'Count',
      1,
      {},
      {
        correlationId: nonSpanishReceiverActionableEventEvent.correlationId,
        eventId: nonSpanishReceiverActionableEventEvent.eventId
      }
    );
  });

  it('should return an error if config cannot be fetched from SSM', async () => {
    const sendReminderIdempotentlyFn = vi.fn();
    const error = new Error('Boooom!');
    const getParameterFromSsmFn = () => Promise.reject(error);

    const result = testit(validEvent, sendReminderIdempotentlyFn, getParameterFromSsmFn);

    await expect(result).rejects.toThrow('Lambda config could not be loaded');
    expect(sendReminderIdempotentlyFn).not.toHaveBeenCalled();
  });
});

type EndpointConfig = Omit<SendEventReminderConfig, 'vonageConfig'> & {
  vonageConfig: Omit<SendEventReminderConfig['vonageConfig'], 'privateKey'>;
};

function testit(
  event: SQSEvent,
  sendReminderIdempotentlyFn: () => Promise<Uuid>,
  getParameterFromSsmFn: () => Promise<string> = () => Promise.resolve('fakePrivateKey'),
  config: EndpointConfig = defaultConfig
): Promise<Uuid | 'MessageNotSentOutsideOfSpain'> {
  setEnv(config);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(UserBaseStore.withConfig).mockReturnValue({} as unknown as UserBaseStore<IdpName>);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(IdempotentProcessor.prototype.sendReminderIdempotently).mockImplementation(
    sendReminderIdempotentlyFn
  );
  vi.mocked(getParameter).mockImplementation(getParameterFromSsmFn);
  // Gotcha: software under test is dynamically imported because it caches a variable. Otherwise, if it gets imported just once tests carry undesired state along.
  return import('./index').then((module) =>
    // @ts-expect-error cjs handler export
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    module.handler(event as unknown as Event, {} as Context)
  );
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
  messagingTopicConfig: {
    topicArn: 'some topic arn' as AwsArn
  },
  messagingConfig: {
    enabled: true
  },
  userBaseStoreConfig: {
    tableName: 'Users-local'
  },
  countryToSMSCostCreditsMap: {
    ES: 7
  },
  demoReminderLimit: 1
};

function setEnv(config: EndpointConfig): void {
  setEnvVonageConfig(config.vonageConfig);
  setEnvMessagingTopicConfig(config.messagingTopicConfig);
  setEnvIdempotencyPersistanceConfig(config);
  setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
  setEnvCreditServiceConfig(config);
}
