import type { SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import type { Algorithm, DecodeVonageAccessJwtConfig, Duration } from '@model/Config';
import type { Jwt } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { AuditTrailService } from '@services/audit-trail';
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
import { setEnvAuditTrailQueueConfig } from '@testing/utils/config';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { describe, it, vi } from 'vitest';
import type { ReminderDeliveryStatusWebhookConfig } from './config';
import { handler, type Event } from './index';

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
  secretOrPrivateKey: string;
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

const validVonageEncodeJwtConfig: EncodeVonageAccessJwtConfig = {
  secretOrPrivateKey: 'this-is-a-fake-secret',
  algorithm: 'HS256',
  issuer: 'Vonage'
};

/* eslint-enable camelcase */

describe('POST Event reminder delivery status webhook', () => {
  it.each(invalidBodies)(
    'should fail validation if the body is invalid',
    async (invalidCaseBody) => {
      console.warn(invalidCaseBody.message_uuid);
      const event = testVonageAuthedEvent(invalidCaseBody, validVonageJwt) as APIGatewayProxyEvent;

      return testit(event).then((resp) => {
        assert(resp, responseErrorNoCorsHeaders(400));
      });
    }
  );

  it.each(validBodies)('should pass validation if the body is valid', async (validCaseBody) => {
    const event = testVonageAuthedEvent(validCaseBody, validVonageJwt) as APIGatewayProxyEvent;

    return testit(event).then((resp) => {
      assert(resp, responseSuccessNoCorsHeaders());
    });
  });

  const defaultEnv = {
    baseConfig: {},
    auditTrailQueueConfig: {
      queueUrl: 'https://fake-queue-url' as Url
    },
    decodeAccessJwtConfig: {
      publicKey: validVonageEncodeJwtConfig.secretOrPrivateKey as VonageJwtSigningSecret,
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
    process.env.VONAGE_WEBHOOK_JWT_SIGNING_SECRET = config.publicKey;
  }

  function setEnv(config: ReminderDeliveryStatusWebhookConfig) {
    setEnvAuditTrailQueueConfig(config.auditTrailQueueConfig);
    setEnvDecodeVonageJwtConfig(config.decodeAccessJwtConfig);
  }

  async function testit(
    event: APIGatewayProxyEvent,
    auditTrailSendResultFn: () => Promise<SendMessageCommandOutput> = () =>
      Promise.resolve({} as SendMessageCommandOutput),
    env: ReminderDeliveryStatusWebhookConfig = defaultEnv
  ): Promise<APIGatewayProxyResult> {
    setEnv(env);
    vi.mock('@services/audit-trail');
    const auditTrailServiceMock = {
      send: vi.fn().mockImplementation(auditTrailSendResultFn)
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(AuditTrailService.withConfig).mockReturnValue(
      auditTrailServiceMock as unknown as AuditTrailService
    );
    return handler(event as unknown as Event, c);
  }
});
