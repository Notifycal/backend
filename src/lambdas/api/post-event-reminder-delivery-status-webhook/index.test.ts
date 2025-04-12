import type { ActionableEventReminderStatusUpdatedEvent } from '@model/app-events/ActionableEventReminderStatusUpdatedEvent';
import type { Algorithm, Duration } from '@model/Config';
import type { DecodeVonageAccessJwtConfig } from '@model/vendor/vonage';
import type { Jwt } from '@notifycal/shared/types';
import type { AwsArn } from '@own-types/model';
import type {
  VonageApiKey,
  VonageApplicationId,
  VonageJwtSigningSecret
} from '@services/messaging';
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

import { logger } from '@common/powertools';
import { SnsService } from '@services/sns';
import { setEnvMessagingTopicConfig } from '@testing/utils/config';
import { ZodError } from 'zod';

/* eslint-disable camelcase */
const invalidBodies = [
  {
    message_uuid: 'not-a-valid-uuid',
    channel: 'sms',
    to: '447700900000',
    from: '447700900001',
    timestamp: '2025-02-03T12:14:25Z',
    status: 'submitted',
    usage: {
      currency: 'EUR',
      price: '0.0333'
    }
  },
  {
    message_uuid: 'cccccccc-dddd-4eee-8fff-0123456789ab',
    channel: 'sms',
    to: '447700900000',
    from: '447700900001',
    timestamp: 'INVALID-TIMESTAMP',
    status: 'submitted',
    usage: {
      currency: 'EUR',
      price: '0.0333'
    }
  },
  {
    message_uuid: 'dddddddd-eeee-4fff-8aaa-0123456789ab',
    channel: 'rcs',
    to: '447700900003',
    from: 'Vonage',
    timestamp: '2025-02-03T14:20:00Z',
    status: 'wrong_status'
  },
  {
    message_uuid: 'eeeeeeee-ffff-4aaa-8bbb-0123456789ab',
    channel: 'sms',
    to: '447700900000',
    from: '447700900001',
    timestamp: '2025-02-03T12:14:25Z',
    status: 'submitted',
    usage: {
      currency: 'USD',
      price: '0.0333'
    }
  },
  {
    message_uuid: 'ffffffff-aaaa-4bbb-8ccc-0123456789ab',
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
];

const validBodies = [
  {
    message_uuid: 'aaaaaaaa-bbbb-4ccc-8ddd-0123456789ab',
    channel: 'sms',
    to: '447700900000',
    from: '447700900001',
    timestamp: '2025-02-03T12:14:25Z',
    status: 'submitted',
    usage: {
      currency: 'EUR',
      price: '0.0333'
    },
    sms: {
      count_total: '2'
    },
    client_ref: 'foobar1234'
  },
  {
    message_uuid: 'bbbbbbbb-cccc-4ddd-8eee-0123456789ab',
    channel: 'rcs',
    to: '447700900002',
    from: 'Vonage',
    timestamp: '2025-02-03T14:20:00Z',
    status: 'read',
    client_ref: 'foobar1234'
  }
];

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

const validQSPObject = {
  userId: '96f3d941-1155-4d50-ac5a-19345fb7e9ef',
  idpId: 'google-123',
  idp: 'google.com',
  correlationId: 'c1625a78-7337-4fd8-a6c4-a0afb9c0ceb9',
  'data[run][slidingWindowInMinutes]': '30',
  'data[run][lowerBoundStartTime]': '2023-01-01T00:00:00Z',
  'data[run][upperBoundStartTime]': '2023-01-01T00:29:59Z',

  'data[message]': 'This is a test message!',

  'data[receiverDetails][phoneNumber]': '+34654321987',
  'data[receiverDetails][type]': 'phone',

  'data[senderDetails][phoneNumber]': '+34654321987',
  'data[senderDetails][type]': 'phone',

  'data[calendar][id]': 'someCalendarId',
  'data[calendar][name]': 'Some Calendar Name',

  'data[calendarEvent][attendees][0][id]': 'attendee@test.com',
  'data[calendarEvent][id]': 'event-1',
  'data[calendarEvent][isAllDayEvent]': 'false',
  'data[calendarEvent][startTime]': '2024-01-02T15:05:00Z',
  'data[calendarEvent][timeZone]': 'Europe/Madrid'
};

describe('POST Event reminder delivery status webhook', () => {
  it.each(invalidBodies)(
    'should fail validation if the body is invalid',
    async (invalidCaseBody) => {
      const event = testVonageAuthedEvent(
        invalidCaseBody,
        validVonageJwt,
        validQSPObject
      ) as APIGatewayProxyEvent;

      return testit(event).then((resp) => {
        assert(resp, responseErrorNoCorsHeaders(400));
      });
    }
  );

  it.each(validBodies)('should pass validation if the body is valid', async (validCaseBody) => {
    const event = testVonageAuthedEvent(
      validCaseBody,
      validVonageJwt,
      validQSPObject
    ) as APIGatewayProxyEvent;

    return testit(event).then((resp) => {
      assert(resp, responseSuccessNoCorsHeaders());
    });
  });

  it('should fail with 401 Unauthorized if the JWT token is invalid', async () => {
    const chosenBody = validBodies[0];
    const event = testVonageAuthedEvent(
      chosenBody,
      'invalid-jwt-token' as Jwt,
      validQSPObject
    ) as APIGatewayProxyEvent;

    return testit(event).then((resp) => {
      assert(resp, responseErrorNoCorsHeaders(401));
    });
  });

  it('should publish a ActionableEventReminderStatusUpdated event to sns service', async () => {
    const safePublishMock = vi.fn();
    const fixedDate = new Date('2025-03-26T08:20:53.240Z');
    vi.setSystemTime(fixedDate);

    const fixedUUID = '0de651ef-535e-4d2e-b9ff-7bf43f5a01ac';
    vi.mocked<(options?: Version4Options, buf?: undefined, offset?: number) => string>(
      uuidv4
    ).mockReturnValue(fixedUUID);

    const chosenBody = validBodies[0];

    const event = testVonageAuthedEvent(chosenBody, validVonageJwt, validQSPObject);

    await testit(event as APIGatewayProxyEvent, safePublishMock);

    const eventQSP = event.queryStringParameters || {};

    expect(event.queryStringParameters).not.toBeNull();
    expect(safePublishMock).toHaveBeenCalledTimes(1);
    expect(safePublishMock).toHaveBeenCalledWith({
      eventType: 'ActionableEventReminderStatusUpdated',
      correlationId: eventQSP.correlationId,
      userId: eventQSP.userId,
      idpId: eventQSP.idpId,
      idp: eventQSP.idp,
      data: {
        messageStatusPayload: {
          ...chosenBody,
          usage: {
            ...chosenBody.usage,
            price: parseFloat(chosenBody.usage?.price || '')
          },
          sms: {
            ...chosenBody.sms,
            // eslint-disable-next-line camelcase
            count_total: parseInt(chosenBody.sms?.count_total || '')
          }
        },
        messageUUID: chosenBody.message_uuid,
        message: eventQSP['data[message]'],
        run: {
          lowerBoundStartTime: eventQSP['data[run][lowerBoundStartTime]'],
          upperBoundStartTime: eventQSP['data[run][upperBoundStartTime]'],
          slidingWindowInMinutes: parseInt(eventQSP['data[run][slidingWindowInMinutes]'])
        },
        senderDetails: {
          phoneNumber: eventQSP['data[senderDetails][phoneNumber]'],
          type: eventQSP['data[senderDetails][type]']
        },
        receiverDetails: {
          phoneNumber: eventQSP['data[receiverDetails][phoneNumber]'],
          type: eventQSP['data[receiverDetails][type]']
        },
        calendar: {
          id: eventQSP['data[calendar][id]'],
          name: eventQSP['data[calendar][name]']
        },
        calendarEvent: {
          attendees: [{ id: 'attendee@test.com' }],
          id: eventQSP['data[calendarEvent][id]'],
          isAllDayEvent: eventQSP['data[calendarEvent][isAllDayEvent]'] === 'true',
          startTime: eventQSP['data[calendarEvent][startTime]'],
          timeZone: eventQSP['data[calendarEvent][timeZone]']
        }
      },
      happenedAt: fixedDate.toISOString(),
      eventId: fixedUUID
    } as ActionableEventReminderStatusUpdatedEvent);

    // Cleanup
    vi.useRealTimers();
  });

  it('should log an error and success if it cannot rebuild the ActionableEventFound event from query string', async () => {
    const errorLoggerSpy = vi.spyOn(logger, 'error');

    const chosenBody = validBodies[1];
    const incompleteQueryStringObject = {
      userId: '96f3d941-1155-4d50-ac5a-19345fb7e9ef',
      idpId: 'google-123',
      idp: 'google.com'
    };
    const event = testVonageAuthedEvent(
      chosenBody,
      validVonageJwt,
      incompleteQueryStringObject
    ) as APIGatewayProxyEvent;

    const resp = await testit(event);
    assert(resp, responseSuccessNoCorsHeaders());

    expect(errorLoggerSpy).toHaveBeenCalledWith(
      'Could not rebuild event from query string',
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error: expect.any(ZodError)
      })
    );
  });

  const defaultEnv = {
    messagingTopicConfig: {
      topicArn: 'some-aws-arn' as AwsArn
    },
    decodeAccessJwtConfig: {
      signingSecret: validVonageEncodeJwtConfig.signingSecret as VonageJwtSigningSecret,
      applicationId: validDecodedVonageJwt.application_id as VonageApplicationId,
      apiKey: validDecodedVonageJwt.api_key as VonageApiKey,
      algorithm: 'HS256' as Algorithm,
      issuer: 'Vonage'
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
  }

  async function testit(
    event: APIGatewayProxyEvent,
    safePublishFn: () => Promise<void> = vi.fn(),
    env: ReminderDeliveryStatusWebhookConfig = defaultEnv
  ): Promise<APIGatewayProxyResult> {
    setEnv(env);
    vi.mock('@services/sns');
    const snsServiceMock = {
      safePublish: safePublishFn
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(SnsService.withConfig).mockReturnValue(snsServiceMock as unknown as SnsService);

    vi.mock('uuid', async () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      const actual = await vi.importActual<typeof import('uuid')>('uuid');
      return {
        ...actual,
        v4: vi.fn(() => actual.v4())
      };
    });

    return handler(event as unknown as Event, c);
  }
});
