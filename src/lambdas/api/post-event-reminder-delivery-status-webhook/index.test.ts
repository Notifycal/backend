import type { Algorithm, Duration } from '@model/Config';
import type { DecodeVonageAccessJwtConfig } from '@model/vendor/vonage/config';
import type { Jwt, Uuid } from '@notifycal/shared/types';
import type { AwsArn } from '@own-types/model';
import type { VonageApiKey, VonageApplicationId, VonageJwtSigningSecret } from '@services/vonage';
import { c, testVonageAuthedEvent } from '@testing/data/apigateway';
import {
  responseErrorNoCorsHeaders,
  responseSuccessNoCorsHeaders
} from '@testing/utils/api-response-handlers';
import { assert } from '@testing/utils/assertions';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4, type Version4Options } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import type { ReminderDeliveryStatusWebhookConfig } from './config';
// @ts-expect-error cjs handler export
import { handler, type Event } from './index';

vi.mock('@services/sns');
vi.mock('@services/credit-adjustment-service');
vi.mock('@services/credits-service');
vi.mock('@services/stores/user-base-store');

import { logger } from '@common/powertools';
import type {
  VonageWebhookMessageStatusPayload,
  VonageWebhookMessageStatusRcsPayload,
  VonageWebhookMessageStatusSmsPayload
} from '@model/vendor/vonage/schemas';
import {
  CreditAdjustmentService,
  type CreditAdjustmentResult
} from '@services/credit-adjustment-service';
import { SnsService } from '@services/sns';
import {
  setEnvCreditServiceConfig,
  setEnvMessagingTopicConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { tap } from '@utils/promises';

/* eslint-disable camelcase */
const invalidBodies: Array<VonageWebhookMessageStatusPayload> = [
  {
    message_uuid: 'not-a-valid-uuid' as Uuid,
    channel: 'sms',
    to: '447700900000',
    from: '447700900001',
    timestamp: '2025-02-03T12:14:25Z',
    status: 'submitted',
    usage: {
      currency: 'EUR',
      price: 0.0333
    }
  },
  {
    message_uuid: 'cccccccc-dddd-4eee-8fff-0123456789ab' as Uuid,
    channel: 'sms',
    to: '447700900000',
    from: '447700900001',
    timestamp: 'INVALID-TIMESTAMP',
    status: 'submitted',
    usage: {
      currency: 'EUR',
      price: 0.0333
    }
  },
  {
    message_uuid: 'dddddddd-eeee-4fff-8aaa-0123456789ab' as Uuid,
    channel: 'rcs',
    to: '447700900003',
    from: 'Vonage',
    timestamp: '2025-02-03T14:20:00Z',
    status: 'wrong_status'
  },
  {
    message_uuid: 'eeeeeeee-ffff-4aaa-8bbb-0123456789ab' as Uuid,
    channel: 'sms',
    to: '447700900000',
    from: '447700900001',
    timestamp: '2025-02-03T12:14:25Z',
    status: 'submitted',
    usage: {
      currency: 'USD', // this is invalid
      price: 0.0333
    }
  },
  {
    message_uuid: 'ffffffff-aaaa-4bbb-8ccc-0123456789ab' as Uuid,
    channel: 'sms',
    to: '123',
    from: '447700900001',
    timestamp: '2025-02-03T12:14:25Z',
    status: 'submitted',
    usage: {
      currency: 'EUR',
      price: 'not-a-number'
    }
  },
  {}
].map((v) => v as unknown as VonageWebhookMessageStatusPayload);

const validSmsBody: VonageWebhookMessageStatusSmsPayload = {
  message_uuid: 'aaaaaaaa-bbbb-4ccc-8ddd-0123456789ab' as Uuid,
  channel: 'sms',
  to: '447700900000',
  from: '447700900001',
  timestamp: '2025-02-03T12:14:25Z',
  status: 'submitted',
  usage: {
    currency: 'EUR',
    price: 0.0333
  },
  sms: {
    count_total: 2
  },
  client_ref: 'foobar1234'
};
const validRcsBody: VonageWebhookMessageStatusRcsPayload = {
  message_uuid: 'bbbbbbbb-cccc-4ddd-8eee-0123456789ab' as Uuid,
  channel: 'rcs',
  to: '447700900002',
  from: 'Vonage',
  timestamp: '2025-02-03T14:20:00Z',
  status: 'read',
  client_ref: 'foobar1234'
};
const validBodies: Array<VonageWebhookMessageStatusPayload> = [validSmsBody, validRcsBody];

export interface EncodeVonageAccessJwtConfig {
  signingSecret: string;
  algorithm: Algorithm;
  issuer: string;
  audience?: Array<string>;
  expiresIn?: Duration;
}

const validVonageJwt =
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJWb25hZ2UiLCJpYXQiOjE3NDE4OTI3ODQsImp0aSI6ImI5MzYwOGNmLWQzZjYtNGZlYi1iNDI2LTUyMjM3N2YwOWViNCIsImFwaV9rZXkiOiIxMjM0NTY3OCIsImFwcGxpY2F0aW9uX2lkIjoiODc2NTQzMjEtMTIzNC00MzIxLTEyMzQtYjM3ZTcxNWFlYmI1IiwicGF5bG9hZF9oYXNoIjoiZDRmNTM0YjQzMzdmOTQzMWUwZTRjYzEwNDgxOGFlNjE3ZGRhMWVjNDQ2YWVkZDkxMzU5ODNjMjQ0YmVhNWM5MCJ9.MEKK7PtsxMTDBywOTfXFIB2x1lUx3Yqcgp7uUFgCHew` as Jwt;
const validDecodedVonageJwt = {
  iss: 'Vonage',
  iat: 1741892784,
  jti: 'b93608cf-d3f6-4feb-b426-522377f09eb4',
  api_key: '12345678',
  application_id: '87654321-1234-4321-1234-b37e715aebb5',
  payload_hash: 'd4f534b4337f9431e0e4cc104818ae617dda1ec446aedd9135983c244bea5c90'
};
/* eslint-enable camelcase */

const validVonageEncodeJwtConfig: EncodeVonageAccessJwtConfig = {
  signingSecret: 'this-is-a-fake-secret',
  algorithm: 'HS256',
  issuer: 'Vonage'
};

const validActionableEventFoundQSPObject = {
  'originalEvent[userId]': '96f3d941-1155-4d50-ac5a-19345fb7e9ef',
  'originalEvent[idpId]': 'google-123',
  'originalEvent[idp]': 'google.com',
  'originalEvent[eventType]': 'ActionableEventFound',
  'originalEvent[correlationId]': 'c1625a78-7337-4fd8-a6c4-a0afb9c0ceb9',
  'originalEvent[data][run][slidingWindowInMinutes]': '30',
  'originalEvent[data][run][lowerBoundStartTime]': '2023-01-01T00:00:00Z',
  'originalEvent[data][run][upperBoundStartTime]': '2023-01-01T00:29:59Z',

  'originalEvent[data][message]': 'This is a test message!',

  'originalEvent[data][receiverDetails][phoneNumber]': '+34654321987',
  'originalEvent[data][receiverDetails][type]': 'phone',
  'originalEvent[data][receiverDetails][countryCode]': 'ES',

  'originalEvent[data][senderDetails][phoneNumber]': '+34654321987',
  'originalEvent[data][senderDetails][type]': 'phone',
  'originalEvent[data][senderDetails][countryCode]': 'ES',

  'originalEvent[data][calendar][id]': 'someCalendarId',
  'originalEvent[data][calendar][name]': 'Some Calendar Name',

  'originalEvent[data][calendarEvent][attendees][0][id]': 'attendee@test.com',
  'originalEvent[data][calendarEvent][id]': 'event-1',
  'originalEvent[data][calendarEvent][isAllDayEvent]': 'false',
  'originalEvent[data][calendarEvent][startTime]': '2024-01-02T15:05:00Z',
  'originalEvent[data][calendarEvent][timeZone]': 'Europe/Madrid',

  'creditDeductionResult[success]': 'true',
  'creditDeductionResult[result]': 'Success',
  'creditDeductionResult[operationDetails][fromBalance]': 'subscription',
  'creditDeductionResult[operationDetails][type]': 'deduct',
  'creditDeductionResult[operationDetails][quantity]': '7',
  'creditDeductionResult[balances][subscription]': '400',
  'creditDeductionResult[balances][topup]': '5',

  'estimatedMessageCount[messages]': '1',
  'estimatedMessageCount[encoding]': 'GSM_7BIT',
  'estimatedMessageCount[remaining]': '34',
  'estimatedMessageCount[inCurrentMessage]': '2',
  'estimatedMessageCount[characterPerMessage]': '160',
  'estimatedMessageCount[length]': '3'
};

const validDemoReminderToBeSentQSPObject = {
  'originalEvent[userId]': '96f3d941-1155-4d50-ac5a-19345fb7e988',
  'originalEvent[idpId]': 'google-456',
  'originalEvent[idp]': 'google.com',
  'originalEvent[eventType]': 'DemoReminderToBeSent',
  'originalEvent[correlationId]': 'c1625a78-7337-4fd8-a6c4-a0afb9c0ceb9',
  'originalEvent[data][message]': 'This is a test message!',

  'originalEvent[data][receiverDetails][phoneNumber]': '+34654321987',
  'originalEvent[data][receiverDetails][type]': 'phone',
  'originalEvent[data][receiverDetails][countryCode]': 'ES',

  'originalEvent[data][senderDetails][phoneNumber]': '+34654321987',
  'originalEvent[data][senderDetails][type]': 'phone',
  'originalEvent[data][senderDetails][countryCode]': 'ES',

  'creditDeductionResult[success]': 'true',
  'creditDeductionResult[result]': 'Success',
  'creditDeductionResult[demoRemindersCount]': '2',

  'estimatedMessageCount[messages]': '1',
  'estimatedMessageCount[encoding]': 'GSM_7BIT',
  'estimatedMessageCount[remaining]': '34',
  'estimatedMessageCount[inCurrentMessage]': '2',
  'estimatedMessageCount[characterPerMessage]': '160',
  'estimatedMessageCount[length]': '3'
};

function mockUuid(uuid: string): void {
  vi.mocked<(options?: Version4Options, buf?: undefined, offset?: number) => string>(
    uuidv4
  ).mockReturnValue(uuid);
}

describe('POST Event reminder delivery status webhook', () => {
  it.each(invalidBodies)(
    'should fail validation if the body is invalid',
    async (invalidCaseBody) => {
      const event = testVonageAuthedEvent(
        invalidCaseBody,
        validVonageJwt,
        validActionableEventFoundQSPObject
      ) as APIGatewayProxyEvent;

      const resp = await testIt(event, vi.fn(), () => Promise.resolve({}));
      assert(resp, responseErrorNoCorsHeaders(400));
    }
  );

  it.each(validBodies)('should pass validation if the body is valid', async (validCaseBody) => {
    const event = testVonageAuthedEvent(
      validCaseBody,
      validVonageJwt,
      validActionableEventFoundQSPObject
    ) as APIGatewayProxyEvent;

    const processWebhookAdjustmentMock = vi.fn().mockResolvedValue({});
    const resp = await testIt(event, vi.fn(), processWebhookAdjustmentMock);

    assert(resp, responseSuccessNoCorsHeaders());

    expect(processWebhookAdjustmentMock).toHaveBeenCalledTimes(1);
  });

  it('should fail with 401 Unauthorized if the JWT token is invalid', async () => {
    const validChosenBody = validSmsBody;
    const invalidJwt = 'invalid-jwt-token' as Jwt;
    const event = testVonageAuthedEvent(
      validChosenBody,
      invalidJwt,
      validActionableEventFoundQSPObject
    ) as APIGatewayProxyEvent;

    const resp = await testIt(event, vi.fn(), () => Promise.resolve({}));
    assert(resp, responseErrorNoCorsHeaders(401));
  });

  it('should publish a ActionableEventReminderStatusUpdated event to sns service', async () => {
    const safePublishMock = vi.fn();
    const validFixedDate = new Date('2025-03-26T08:20:53.240Z');
    vi.setSystemTime(validFixedDate);

    const validFixedUUID = '0de651ef-535e-4d2e-b9ff-7bf43f5a01ac';
    mockUuid(validFixedUUID);

    const validChosenBody: VonageWebhookMessageStatusSmsPayload = validSmsBody;

    const event = testVonageAuthedEvent(
      validChosenBody,
      validVonageJwt,
      validActionableEventFoundQSPObject
    );

    const processWebhookAdjustmentMock = vi.fn().mockResolvedValue({});
    await testIt(event as APIGatewayProxyEvent, safePublishMock, processWebhookAdjustmentMock);

    expect(processWebhookAdjustmentMock).toHaveBeenCalledTimes(1);
    expect(processWebhookAdjustmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        originalEvent: expect.objectContaining({
          eventType: 'ActionableEventFound',
          userId: '96f3d941-1155-4d50-ac5a-19345fb7e9ef'
        }),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        estimatedMessageCount: expect.objectContaining({
          messages: 1
        })
      }),
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        message_uuid: validChosenBody.message_uuid,
        channel: 'sms',
        status: 'submitted'
      })
    );

    const eventQSP = event.queryStringParameters || {};

    expect(event.queryStringParameters).not.toBeNull();
    expect(safePublishMock).toHaveBeenCalledTimes(1);
    expect(safePublishMock).toHaveBeenCalledWith({
      eventType: 'ActionableEventReminderStatusUpdated',
      correlationId: eventQSP['originalEvent[correlationId]'],
      userId: eventQSP['originalEvent[userId]'],
      idpId: eventQSP['originalEvent[idpId]'],
      idp: eventQSP['originalEvent[idp]'],
      data: {
        messageStatusPayload: {
          ...validChosenBody,
          usage: {
            ...validChosenBody?.usage,
            price: validChosenBody.usage?.price
          },
          sms: {
            ...validChosenBody.sms,
            // eslint-disable-next-line camelcase
            count_total: validChosenBody.sms?.count_total
          }
        },
        messageUUID: validChosenBody.message_uuid,
        message: eventQSP['originalEvent[data][message]'],
        run: {
          lowerBoundStartTime: eventQSP['originalEvent[data][run][lowerBoundStartTime]'],
          upperBoundStartTime: eventQSP['originalEvent[data][run][upperBoundStartTime]'],
          slidingWindowInMinutes: Number(
            eventQSP['originalEvent[data][run][slidingWindowInMinutes]']
          )
        },
        senderDetails: {
          phoneNumber: eventQSP['originalEvent[data][senderDetails][phoneNumber]'],
          type: eventQSP['originalEvent[data][senderDetails][type]'],
          countryCode: eventQSP['originalEvent[data][senderDetails][countryCode]']
        },
        receiverDetails: {
          phoneNumber: eventQSP['originalEvent[data][receiverDetails][phoneNumber]'],
          type: eventQSP['originalEvent[data][receiverDetails][type]'],
          countryCode: eventQSP['originalEvent[data][senderDetails][countryCode]']
        },
        calendar: {
          id: eventQSP['originalEvent[data][calendar][id]'],
          name: eventQSP['originalEvent[data][calendar][name]']
        },
        calendarEvent: {
          attendees: [{ id: 'attendee@test.com' }],
          id: eventQSP['originalEvent[data][calendarEvent][id]'],
          isAllDayEvent: eventQSP['originalEvent[data][calendarEvent][isAllDayEvent]'] === 'true',
          startTime: eventQSP['originalEvent[data][calendarEvent][startTime]'],
          timeZone: eventQSP['originalEvent[data][calendarEvent][timeZone]']
        },
        creditDeductionResult: {
          success: Boolean(eventQSP['creditDeductionResult[success]']),
          result: eventQSP['creditDeductionResult[result]'],
          operationDetails: {
            fromBalance: eventQSP['creditDeductionResult[operationDetails][fromBalance]'],
            type: eventQSP['creditDeductionResult[operationDetails][type]'],
            quantity: Number(eventQSP['creditDeductionResult[operationDetails][quantity]'])
          },
          balances: {
            subscription: Number(eventQSP['creditDeductionResult[balances][subscription]']),
            topup: Number(eventQSP['creditDeductionResult[balances][topup]'])
          }
        },
        creditAdjustmentResult: undefined
      },
      happenedAt: validFixedDate.toISOString(),
      eventId: validFixedUUID
    });
  });

  it('should publish a ActionableEventReminderStatusUpdated event with credit restoration when Vonage error occurs', async () => {
    const safePublishMock = vi.fn();
    const validFixedDate = new Date('2025-03-26T08:20:53.240Z');
    vi.setSystemTime(validFixedDate);

    const validFixedUUID = '0de651ef-535e-4d2e-b9ff-7bf43f5a01ac';
    mockUuid(validFixedUUID);

    const validChosenBodyWithError = {
      ...validSmsBody,
      status: 'rejected' as const,
      error: {
        error: {
          type: 'https://developer.vonage.com/api/messages#rate-limit',
          title: '1030',
          detail: 'Internal error  -  There was an error processing your request in the Platform',
          instance: 'bf0ca0bf927b3b52e3cb03217e1a1ddf'
        }
      }
    };

    const event = testVonageAuthedEvent(
      validChosenBodyWithError,
      validVonageJwt,
      validActionableEventFoundQSPObject
    );

    const validCreditAdjustmentResult = {
      success: true as const,
      result: 'Success' as const,
      operationDetails: {
        fromBalance: 'subscription' as const,
        type: 'restore' as const,
        quantity: 7
      },
      balances: {
        subscription: 407,
        topup: 5
      }
    };

    const processWebhookAdjustmentMock = vi
      .fn()
      .mockResolvedValue({ creditAdjustmentResult: validCreditAdjustmentResult });
    await testIt(event as APIGatewayProxyEvent, safePublishMock, processWebhookAdjustmentMock);

    expect(processWebhookAdjustmentMock).toHaveBeenCalledTimes(1);
    expect(processWebhookAdjustmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        originalEvent: expect.objectContaining({
          eventType: 'ActionableEventFound',
          userId: '96f3d941-1155-4d50-ac5a-19345fb7e9ef'
        }),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        estimatedMessageCount: expect.objectContaining({
          messages: 1
        })
      }),
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        message_uuid: validChosenBodyWithError.message_uuid,
        channel: 'sms',
        status: 'rejected'
      })
    );

    const eventQSP = event.queryStringParameters || {};

    expect(event.queryStringParameters).not.toBeNull();
    expect(safePublishMock).toHaveBeenCalledTimes(1);
    expect(safePublishMock).toHaveBeenCalledWith({
      eventType: 'ActionableEventReminderStatusUpdated',
      correlationId: eventQSP['originalEvent[correlationId]'],
      userId: eventQSP['originalEvent[userId]'],
      idpId: eventQSP['originalEvent[idpId]'],
      idp: eventQSP['originalEvent[idp]'],
      data: {
        messageStatusPayload: {
          ...validChosenBodyWithError,
          usage: {
            ...validChosenBodyWithError.usage,
            price: validChosenBodyWithError.usage?.price
          },
          sms: {
            ...validChosenBodyWithError.sms,
            // eslint-disable-next-line camelcase
            count_total: Number(validChosenBodyWithError.sms?.count_total || '')
          }
        },
        messageUUID: validChosenBodyWithError.message_uuid,
        message: eventQSP['originalEvent[data][message]'],
        run: {
          lowerBoundStartTime: eventQSP['originalEvent[data][run][lowerBoundStartTime]'],
          upperBoundStartTime: eventQSP['originalEvent[data][run][upperBoundStartTime]'],
          slidingWindowInMinutes: Number(
            eventQSP['originalEvent[data][run][slidingWindowInMinutes]']
          )
        },
        senderDetails: {
          phoneNumber: eventQSP['originalEvent[data][senderDetails][phoneNumber]'],
          type: eventQSP['originalEvent[data][senderDetails][type]'],
          countryCode: eventQSP['originalEvent[data][senderDetails][countryCode]']
        },
        receiverDetails: {
          phoneNumber: eventQSP['originalEvent[data][receiverDetails][phoneNumber]'],
          type: eventQSP['originalEvent[data][receiverDetails][type]'],
          countryCode: eventQSP['originalEvent[data][senderDetails][countryCode]']
        },
        calendar: {
          id: eventQSP['originalEvent[data][calendar][id]'],
          name: eventQSP['originalEvent[data][calendar][name]']
        },
        calendarEvent: {
          attendees: [{ id: 'attendee@test.com' }],
          id: eventQSP['originalEvent[data][calendarEvent][id]'],
          isAllDayEvent: eventQSP['originalEvent[data][calendarEvent][isAllDayEvent]'] === 'true',
          startTime: eventQSP['originalEvent[data][calendarEvent][startTime]'],
          timeZone: eventQSP['originalEvent[data][calendarEvent][timeZone]']
        },
        creditDeductionResult: {
          success: Boolean(eventQSP['creditDeductionResult[success]']),
          result: eventQSP['creditDeductionResult[result]'],
          operationDetails: {
            fromBalance: eventQSP['creditDeductionResult[operationDetails][fromBalance]'],
            type: eventQSP['creditDeductionResult[operationDetails][type]'],
            quantity: Number(eventQSP['creditDeductionResult[operationDetails][quantity]'])
          },
          balances: {
            subscription: Number(eventQSP['creditDeductionResult[balances][subscription]']),
            topup: Number(eventQSP['creditDeductionResult[balances][topup]'])
          }
        },
        creditAdjustmentResult: validCreditAdjustmentResult
      },
      happenedAt: validFixedDate.toISOString(),
      eventId: validFixedUUID
    });
  });

  it('should publish a ActionableEventReminderStatusUpdated event with credit restoration when message count is higher than estimated', async () => {
    const safePublishMock = vi.fn();
    const validFixedDate = new Date('2025-03-26T08:20:53.240Z');
    vi.setSystemTime(validFixedDate);

    const validFixedUUID = '0de651ef-535e-4d2e-b9ff-7bf43f5a01ac';
    mockUuid(validFixedUUID);

    const validChosenBodyWithOvercharge = {
      ...validSmsBody,
      sms: {
        // eslint-disable-next-line camelcase
        count_total: '3'
      }
    };

    const event = testVonageAuthedEvent(
      validChosenBodyWithOvercharge,
      validVonageJwt,
      validActionableEventFoundQSPObject
    );

    const validCreditAdjustmentResult = {
      success: true as const,
      result: 'Success' as const,
      operationDetails: {
        fromBalance: 'subscription' as const,
        type: 'restore' as const,
        quantity: 2
      },
      balances: {
        subscription: 402,
        topup: 5
      }
    };

    const processWebhookAdjustmentMock = vi
      .fn()
      .mockResolvedValue({ creditAdjustmentResult: validCreditAdjustmentResult });
    await testIt(event as APIGatewayProxyEvent, safePublishMock, processWebhookAdjustmentMock);

    expect(processWebhookAdjustmentMock).toHaveBeenCalledTimes(1);
    expect(processWebhookAdjustmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        originalEvent: expect.objectContaining({
          eventType: 'ActionableEventFound',
          userId: '96f3d941-1155-4d50-ac5a-19345fb7e9ef'
        }),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        estimatedMessageCount: expect.objectContaining({
          messages: 1
        })
      }),
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        message_uuid: validChosenBodyWithOvercharge.message_uuid,
        channel: 'sms',
        status: 'submitted'
      })
    );

    const eventQSP = event.queryStringParameters || {};

    expect(event.queryStringParameters).not.toBeNull();
    expect(safePublishMock).toHaveBeenCalledTimes(1);
    expect(safePublishMock).toHaveBeenCalledWith({
      eventType: 'ActionableEventReminderStatusUpdated',
      correlationId: eventQSP['originalEvent[correlationId]'],
      userId: eventQSP['originalEvent[userId]'],
      idpId: eventQSP['originalEvent[idpId]'],
      idp: eventQSP['originalEvent[idp]'],
      data: {
        messageStatusPayload: {
          ...validChosenBodyWithOvercharge,
          usage: {
            ...validChosenBodyWithOvercharge.usage,
            price: validChosenBodyWithOvercharge.usage?.price
          },
          sms: {
            ...validChosenBodyWithOvercharge.sms,
            // eslint-disable-next-line camelcase
            count_total: Number(validChosenBodyWithOvercharge.sms?.count_total || '')
          }
        },
        messageUUID: validChosenBodyWithOvercharge.message_uuid,
        message: eventQSP['originalEvent[data][message]'],
        run: {
          lowerBoundStartTime: eventQSP['originalEvent[data][run][lowerBoundStartTime]'],
          upperBoundStartTime: eventQSP['originalEvent[data][run][upperBoundStartTime]'],
          slidingWindowInMinutes: Number(
            eventQSP['originalEvent[data][run][slidingWindowInMinutes]']
          )
        },
        senderDetails: {
          phoneNumber: eventQSP['originalEvent[data][senderDetails][phoneNumber]'],
          type: eventQSP['originalEvent[data][senderDetails][type]'],
          countryCode: eventQSP['originalEvent[data][senderDetails][countryCode]']
        },
        receiverDetails: {
          phoneNumber: eventQSP['originalEvent[data][receiverDetails][phoneNumber]'],
          type: eventQSP['originalEvent[data][receiverDetails][type]'],
          countryCode: eventQSP['originalEvent[data][senderDetails][countryCode]']
        },
        calendar: {
          id: eventQSP['originalEvent[data][calendar][id]'],
          name: eventQSP['originalEvent[data][calendar][name]']
        },
        calendarEvent: {
          attendees: [{ id: 'attendee@test.com' }],
          id: eventQSP['originalEvent[data][calendarEvent][id]'],
          isAllDayEvent: eventQSP['originalEvent[data][calendarEvent][isAllDayEvent]'] === 'true',
          startTime: eventQSP['originalEvent[data][calendarEvent][startTime]'],
          timeZone: eventQSP['originalEvent[data][calendarEvent][timeZone]']
        },
        creditDeductionResult: {
          success: Boolean(eventQSP['creditDeductionResult[success]']),
          result: eventQSP['creditDeductionResult[result]'],
          operationDetails: {
            fromBalance: eventQSP['creditDeductionResult[operationDetails][fromBalance]'],
            type: eventQSP['creditDeductionResult[operationDetails][type]'],
            quantity: Number(eventQSP['creditDeductionResult[operationDetails][quantity]'] || '')
          },
          balances: {
            subscription: Number(eventQSP['creditDeductionResult[balances][subscription]'] || ''),
            topup: Number(eventQSP['creditDeductionResult[balances][topup]'] || '')
          }
        },
        creditAdjustmentResult: validCreditAdjustmentResult
      },
      happenedAt: validFixedDate.toISOString(),
      eventId: validFixedUUID
    });
  });

  it('should publish a DemoReminderToBeSentStatusUpdated event to sns service', async () => {
    const safePublishMock = vi.fn();
    const validFixedDate = new Date('2025-03-26T08:20:53.444Z');
    vi.setSystemTime(validFixedDate);

    const validFixedUUID = '0de651ef-535e-4d2e-b9ff-7bf43f5a0aaa';
    mockUuid(validFixedUUID);

    const validChosenBody = validSmsBody;

    const event = testVonageAuthedEvent(
      validChosenBody,
      validVonageJwt,
      validDemoReminderToBeSentQSPObject
    );

    const processWebhookAdjustmentMock = vi.fn().mockResolvedValue({});
    await testIt(event as APIGatewayProxyEvent, safePublishMock, processWebhookAdjustmentMock);

    expect(processWebhookAdjustmentMock).toHaveBeenCalledTimes(1);
    expect(processWebhookAdjustmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        originalEvent: expect.objectContaining({
          eventType: 'DemoReminderToBeSent',
          userId: '96f3d941-1155-4d50-ac5a-19345fb7e988'
        }),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        estimatedMessageCount: expect.objectContaining({
          messages: 1
        })
      }),
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        message_uuid: validChosenBody.message_uuid,
        channel: 'sms',
        status: 'submitted'
      })
    );

    const eventQSP = event.queryStringParameters || {};

    expect(event.queryStringParameters).not.toBeNull();
    expect(safePublishMock).toHaveBeenCalledTimes(1);
    expect(safePublishMock).toHaveBeenCalledWith({
      eventType: 'DemoReminderToBeSentStatusUpdated',
      correlationId: eventQSP['originalEvent[correlationId]'],
      userId: eventQSP['originalEvent[userId]'],
      idpId: eventQSP['originalEvent[idpId]'],
      idp: eventQSP['originalEvent[idp]'],
      data: {
        messageStatusPayload: {
          ...validChosenBody,
          usage: {
            ...validChosenBody.usage,
            price: validChosenBody.usage?.price
          },
          sms: {
            ...validChosenBody.sms,
            // eslint-disable-next-line camelcase
            count_total: Number(validChosenBody.sms?.count_total || '')
          }
        },
        messageUUID: validChosenBody.message_uuid,
        message: eventQSP['originalEvent[data][message]'],

        senderDetails: {
          phoneNumber: eventQSP['originalEvent[data][senderDetails][phoneNumber]'],
          type: eventQSP['originalEvent[data][senderDetails][type]'],
          countryCode: eventQSP['originalEvent[data][senderDetails][countryCode]']
        },
        receiverDetails: {
          phoneNumber: eventQSP['originalEvent[data][receiverDetails][phoneNumber]'],
          type: eventQSP['originalEvent[data][receiverDetails][type]'],
          countryCode: eventQSP['originalEvent[data][senderDetails][countryCode]']
        },
        demoCounterIncrementResult: {
          success: Boolean(eventQSP['creditDeductionResult[success]']),
          result: eventQSP['creditDeductionResult[result]'],
          demoRemindersCount: Number(eventQSP['creditDeductionResult[demoRemindersCount]'] || '')
        },
        demoCounterAdjustmentResult: undefined
      },
      happenedAt: validFixedDate.toISOString(),
      eventId: validFixedUUID
    });
  });

  it('should publish a DemoReminderToBeSentStatusUpdated event with demo counter decrement when Vonage error occurs', async () => {
    const safePublishMock = vi.fn();
    const validFixedDate = new Date('2025-03-26T08:20:53.444Z');
    vi.setSystemTime(validFixedDate);

    const validFixedUUID = '0de651ef-535e-4d2e-b9ff-7bf43f5a0aaa';
    mockUuid(validFixedUUID);

    const validChosenBodyWithError = {
      ...validSmsBody,
      status: 'rejected' as const,
      error: {
        error: {
          type: 'https://developer.vonage.com/api/messages#rate-limit',
          title: '1000',
          detail:
            'Throttled - You have exceeded the submission capacity allowed on this account. Please wait and retry',
          instance: 'bf0ca0bf927b3b52e3cb03217e1a1ddf'
        }
      }
    };

    const event = testVonageAuthedEvent(
      validChosenBodyWithError,
      validVonageJwt,
      validDemoReminderToBeSentQSPObject
    );

    const validDemoCounterAdjustmentResult = {
      success: true as const,
      result: 'Success' as const,
      demoRemindersCount: 1
    };

    const processWebhookAdjustmentMock = vi
      .fn()
      .mockResolvedValue({ demoCounterAdjustmentResult: validDemoCounterAdjustmentResult });
    await testIt(event as APIGatewayProxyEvent, safePublishMock, processWebhookAdjustmentMock);

    expect(processWebhookAdjustmentMock).toHaveBeenCalledTimes(1);
    expect(processWebhookAdjustmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        originalEvent: expect.objectContaining({
          eventType: 'DemoReminderToBeSent',
          userId: '96f3d941-1155-4d50-ac5a-19345fb7e988'
        }),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        estimatedMessageCount: expect.objectContaining({
          messages: 1
        })
      }),
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        message_uuid: validChosenBodyWithError.message_uuid,
        channel: 'sms',
        status: 'rejected'
      })
    );

    const eventQSP = event.queryStringParameters || {};

    expect(event.queryStringParameters).not.toBeNull();
    expect(safePublishMock).toHaveBeenCalledTimes(1);
    expect(safePublishMock).toHaveBeenCalledWith({
      eventType: 'DemoReminderToBeSentStatusUpdated',
      correlationId: eventQSP['originalEvent[correlationId]'],
      userId: eventQSP['originalEvent[userId]'],
      idpId: eventQSP['originalEvent[idpId]'],
      idp: eventQSP['originalEvent[idp]'],
      data: {
        messageStatusPayload: {
          ...validChosenBodyWithError,
          usage: {
            ...validChosenBodyWithError.usage,
            price: validChosenBodyWithError.usage?.price
          },
          sms: {
            ...validChosenBodyWithError.sms,
            // eslint-disable-next-line camelcase
            count_total: Number(validChosenBodyWithError.sms?.count_total || '')
          }
        },
        messageUUID: validChosenBodyWithError.message_uuid,
        message: eventQSP['originalEvent[data][message]'],
        senderDetails: {
          phoneNumber: eventQSP['originalEvent[data][senderDetails][phoneNumber]'],
          type: eventQSP['originalEvent[data][senderDetails][type]'],
          countryCode: eventQSP['originalEvent[data][senderDetails][countryCode]']
        },
        receiverDetails: {
          phoneNumber: eventQSP['originalEvent[data][receiverDetails][phoneNumber]'],
          type: eventQSP['originalEvent[data][receiverDetails][type]'],
          countryCode: eventQSP['originalEvent[data][senderDetails][countryCode]']
        },
        demoCounterIncrementResult: {
          success: Boolean(eventQSP['creditDeductionResult[success]']),
          result: eventQSP['creditDeductionResult[result]'],
          demoRemindersCount: Number(eventQSP['creditDeductionResult[demoRemindersCount]'] || '')
        },
        demoCounterAdjustmentResult: validDemoCounterAdjustmentResult
      },
      happenedAt: validFixedDate.toISOString(),
      eventId: validFixedUUID
    });
  });

  it('should not restore credits when message count matches estimation', async () => {
    const safePublishMock = vi.fn();
    const validFixedDate = new Date('2025-03-26T08:20:53.240Z');
    vi.setSystemTime(validFixedDate);

    const validFixedUUID = '0de651ef-535e-4d2e-b9ff-7bf43f5a01ac';
    mockUuid(validFixedUUID);

    const validChosenBodyWithExactMatch = {
      ...validSmsBody,
      sms: {
        // eslint-disable-next-line camelcase
        count_total: '1'
      }
    };

    const event = testVonageAuthedEvent(
      validChosenBodyWithExactMatch,
      validVonageJwt,
      validActionableEventFoundQSPObject
    );

    const processWebhookAdjustmentMock = vi.fn().mockResolvedValue({});
    await testIt(event as APIGatewayProxyEvent, safePublishMock, processWebhookAdjustmentMock);

    expect(processWebhookAdjustmentMock).toHaveBeenCalledTimes(1);
    expect(processWebhookAdjustmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        originalEvent: expect.objectContaining({
          eventType: 'ActionableEventFound',
          userId: '96f3d941-1155-4d50-ac5a-19345fb7e9ef'
        }),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        estimatedMessageCount: expect.objectContaining({
          messages: 1
        })
      }),
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        message_uuid: validChosenBodyWithExactMatch.message_uuid,
        channel: 'sms',
        status: 'submitted'
      })
    );

    const eventQSP = event.queryStringParameters || {};

    expect(event.queryStringParameters).not.toBeNull();
    expect(safePublishMock).toHaveBeenCalledTimes(1);
    expect(safePublishMock).toHaveBeenCalledWith({
      eventType: 'ActionableEventReminderStatusUpdated',
      correlationId: eventQSP['originalEvent[correlationId]'],
      userId: eventQSP['originalEvent[userId]'],
      idpId: eventQSP['originalEvent[idpId]'],
      idp: eventQSP['originalEvent[idp]'],
      data: {
        messageStatusPayload: {
          ...validChosenBodyWithExactMatch,
          usage: {
            ...validChosenBodyWithExactMatch.usage,
            price: validChosenBodyWithExactMatch.usage?.price
          },
          sms: {
            ...validChosenBodyWithExactMatch.sms,
            // eslint-disable-next-line camelcase
            count_total: Number(validChosenBodyWithExactMatch.sms?.count_total || '')
          }
        },
        messageUUID: validChosenBodyWithExactMatch.message_uuid,
        message: eventQSP['originalEvent[data][message]'],
        run: {
          lowerBoundStartTime: eventQSP['originalEvent[data][run][lowerBoundStartTime]'],
          upperBoundStartTime: eventQSP['originalEvent[data][run][upperBoundStartTime]'],
          slidingWindowInMinutes: Number(
            eventQSP['originalEvent[data][run][slidingWindowInMinutes]']
          )
        },
        senderDetails: {
          phoneNumber: eventQSP['originalEvent[data][senderDetails][phoneNumber]'],
          type: eventQSP['originalEvent[data][senderDetails][type]'],
          countryCode: eventQSP['originalEvent[data][senderDetails][countryCode]']
        },
        receiverDetails: {
          phoneNumber: eventQSP['originalEvent[data][receiverDetails][phoneNumber]'],
          type: eventQSP['originalEvent[data][receiverDetails][type]'],
          countryCode: eventQSP['originalEvent[data][senderDetails][countryCode]']
        },
        calendar: {
          id: eventQSP['originalEvent[data][calendar][id]'],
          name: eventQSP['originalEvent[data][calendar][name]']
        },
        calendarEvent: {
          attendees: [{ id: 'attendee@test.com' }],
          id: eventQSP['originalEvent[data][calendarEvent][id]'],
          isAllDayEvent: eventQSP['originalEvent[data][calendarEvent][isAllDayEvent]'] === 'true',
          startTime: eventQSP['originalEvent[data][calendarEvent][startTime]'],
          timeZone: eventQSP['originalEvent[data][calendarEvent][timeZone]']
        },
        creditDeductionResult: {
          success: Boolean(eventQSP['creditDeductionResult[success]']),
          result: eventQSP['creditDeductionResult[result]'],
          operationDetails: {
            fromBalance: eventQSP['creditDeductionResult[operationDetails][fromBalance]'],
            type: eventQSP['creditDeductionResult[operationDetails][type]'],
            quantity: Number(eventQSP['creditDeductionResult[operationDetails][quantity]'] || '')
          },
          balances: {
            subscription: Number(eventQSP['creditDeductionResult[balances][subscription]'] || ''),
            topup: Number(eventQSP['creditDeductionResult[balances][topup]'] || '')
          }
        },
        creditAdjustmentResult: undefined
      },
      happenedAt: validFixedDate.toISOString(),
      eventId: validFixedUUID
    });
  });

  it('should not decrement demo counter when message count matches estimation for demo reminder', async () => {
    const safePublishMock = vi.fn();
    const validFixedDate = new Date('2025-03-26T08:20:53.444Z');
    vi.setSystemTime(validFixedDate);

    const validFixedUUID = '0de651ef-535e-4d2e-b9ff-7bf43f5a0aaa';
    mockUuid(validFixedUUID);

    const validChosenBodyWithExactMatch: VonageWebhookMessageStatusSmsPayload = {
      ...validSmsBody,
      sms: {
        // eslint-disable-next-line camelcase
        count_total: 1
      }
    };

    const event = testVonageAuthedEvent(
      validChosenBodyWithExactMatch,
      validVonageJwt,
      validDemoReminderToBeSentQSPObject
    );

    const processWebhookAdjustmentMock = vi.fn().mockResolvedValue({});
    await testIt(event as APIGatewayProxyEvent, safePublishMock, processWebhookAdjustmentMock);

    expect(processWebhookAdjustmentMock).toHaveBeenCalledTimes(1);
    expect(processWebhookAdjustmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        originalEvent: expect.objectContaining({
          eventType: 'DemoReminderToBeSent',
          userId: '96f3d941-1155-4d50-ac5a-19345fb7e988'
        }),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        estimatedMessageCount: expect.objectContaining({
          messages: 1
        })
      }),
      expect.objectContaining({
        // eslint-disable-next-line camelcase
        message_uuid: validChosenBodyWithExactMatch.message_uuid,
        channel: 'sms',
        status: 'submitted'
      })
    );

    const eventQSP = event.queryStringParameters || {};

    expect(event.queryStringParameters).not.toBeNull();
    expect(safePublishMock).toHaveBeenCalledTimes(1);
    expect(safePublishMock).toHaveBeenCalledWith({
      eventType: 'DemoReminderToBeSentStatusUpdated',
      correlationId: eventQSP['originalEvent[correlationId]'],
      userId: eventQSP['originalEvent[userId]'],
      idpId: eventQSP['originalEvent[idpId]'],
      idp: eventQSP['originalEvent[idp]'],
      data: {
        messageStatusPayload: {
          ...validChosenBodyWithExactMatch,
          usage: {
            ...validChosenBodyWithExactMatch.usage,
            price: validChosenBodyWithExactMatch.usage?.price
          },
          sms: {
            ...validChosenBodyWithExactMatch.sms,
            // eslint-disable-next-line camelcase
            count_total: Number(validChosenBodyWithExactMatch.sms?.count_total || '')
          }
        },
        messageUUID: validChosenBodyWithExactMatch.message_uuid,
        message: eventQSP['originalEvent[data][message]'],
        senderDetails: {
          phoneNumber: eventQSP['originalEvent[data][senderDetails][phoneNumber]'],
          type: eventQSP['originalEvent[data][senderDetails][type]'],
          countryCode: eventQSP['originalEvent[data][senderDetails][countryCode]']
        },
        receiverDetails: {
          phoneNumber: eventQSP['originalEvent[data][receiverDetails][phoneNumber]'],
          type: eventQSP['originalEvent[data][receiverDetails][type]'],
          countryCode: eventQSP['originalEvent[data][senderDetails][countryCode]']
        },
        demoCounterIncrementResult: {
          success: Boolean(eventQSP['creditDeductionResult[success]']),
          result: eventQSP['creditDeductionResult[result]'],
          demoRemindersCount: Number(eventQSP['creditDeductionResult[demoRemindersCount]'])
        },
        demoCounterAdjustmentResult: undefined
      },
      happenedAt: validFixedDate.toISOString(),
      eventId: validFixedUUID
    });
  });

  it('should log an error and success if it cannot rebuild the neither ActionableEventFound nor DemoReminderToBeSent event from query string', async () => {
    const errorLoggerSpy = vi.spyOn(logger, 'error');

    const validChosenBody = validBodies[1];
    const invalidIncompleteQueryStringObject = {
      'originalEvent[userId]': '96f3d941-1155-4d50-ac5a-19345fb7e9ef',
      'originalEvent[idpId]': 'google-123',
      'originalEvent[idp]': 'google.com'
    };
    const event = testVonageAuthedEvent(
      validChosenBody,
      validVonageJwt,
      invalidIncompleteQueryStringObject
    ) as APIGatewayProxyEvent;

    const processWebhookAdjustmentMock = vi.fn().mockResolvedValue({});
    const resp = await testIt(event, vi.fn(), processWebhookAdjustmentMock);
    assert(resp, responseSuccessNoCorsHeaders());

    // Should NOT call processWebhookAdjustment because query string rebuild fails
    expect(processWebhookAdjustmentMock).not.toHaveBeenCalled();

    expect(errorLoggerSpy).toHaveBeenCalledWith(
      'Could not rebuild event from query string',
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error: expect.objectContaining({
          message:
            'Could not parse query string neither as ActionableEventFoundEvent nor DemoReminderToBeSentEvent along with credit deduction result and estimated message count'
        })
      })
    );
  });

  const validDefaultEnv = {
    messagingTopicConfig: {
      topicArn: 'some-aws-arn' as AwsArn
    },
    decodeAccessJwtConfig: {
      signingSecret: validVonageEncodeJwtConfig.signingSecret as VonageJwtSigningSecret,
      applicationId: validDecodedVonageJwt.application_id as VonageApplicationId,
      apiKey: validDecodedVonageJwt.api_key as VonageApiKey,
      algorithm: 'HS256' as Algorithm,
      issuer: 'Vonage'
    },
    userBaseStoreConfig: {
      tableName: 'Users-local'
    },
    countryToSMSCostCreditsMap: {
      ES: 1,
      US: 2
    }
  };

  function setEnvDecodeVonageJwtConfig(config: DecodeVonageAccessJwtConfig): void {
    process.env.VONAGE_APPLICATION_ID = config.applicationId;
    process.env.VONAGE_API_KEY = config.apiKey;
    process.env.VONAGE_JWT_ISSUER = config.issuer;
    process.env.VONAGE_JWT_ALGORITHM = config.algorithm;
    process.env.VONAGE_WEBHOOK_JWT_SIGNING_SECRET = config.signingSecret;
  }

  function setEnv(config: ReminderDeliveryStatusWebhookConfig) {
    setEnvDecodeVonageJwtConfig(config.decodeAccessJwtConfig);
    setEnvMessagingTopicConfig(config.messagingTopicConfig);
    setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
    setEnvCreditServiceConfig({ countryToSMSCostCreditsMap: config.countryToSMSCostCreditsMap });
  }

  function testIt(
    event: APIGatewayProxyEvent,
    safePublishFn: () => Promise<void> = vi.fn(),
    processWebhookAdjustmentFn: () => Promise<CreditAdjustmentResult>,
    env: ReminderDeliveryStatusWebhookConfig = validDefaultEnv
  ): Promise<APIGatewayProxyResult> {
    setEnv(env);

    const snsServiceMock = {
      safePublish: safePublishFn
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(SnsService.withConfig).mockReturnValue(snsServiceMock as unknown as SnsService);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(CreditAdjustmentService.prototype.processWebhookAdjustment).mockImplementation(
      processWebhookAdjustmentFn
    );

    vi.mock('uuid', async () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      const actual = await vi.importActual<typeof import('uuid')>('uuid');
      return {
        ...actual,
        v4: vi.fn(() => actual.v4())
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return handler(event as unknown as Event, c).then(
      tap(() => {
        vi.useRealTimers();
      })
    );
  }
});
