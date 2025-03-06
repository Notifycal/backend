import { c, testEvent } from '@testing/data/apigateway';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { describe, it } from 'vitest';
import { assert } from '@testing/utils/assertions';
import type { ReminderDeliveryStatusWebhookConfig } from './config';
import { setEnvBaseConfig } from '@testing/utils/config';
import { handler, type Event } from './index';
import { responseError, responseSuccess } from '@testing/utils/api-response-handlers';

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
  }
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

/* eslint-enable camelcase */

describe('POST Event reminder delivery status webhook', () => {
  it.each(invalidBodies)('should fail validation if the body is invalid', (invalidCaseBody) => {
    const event = testEvent(invalidCaseBody) as APIGatewayProxyEvent;

    return testit(event).then((resp) => {
      assert(resp, responseError(400));
    });
  });

  it.each(validBodies)('should pass validation if the body is valid', (validCaseBody) => {
    const event = testEvent(validCaseBody) as APIGatewayProxyEvent;

    return testit(event).then((resp) => {
      assert(resp, responseSuccess());
    });
  });

  const defaultEnv = {
    baseConfig: {
      frontendDomain: 'http://localhost:5173'
    }
  };

  function setEnv(config: ReminderDeliveryStatusWebhookConfig) {
    setEnvBaseConfig(config.baseConfig);
  }

  async function testit(
    event: APIGatewayProxyEvent,
    env: ReminderDeliveryStatusWebhookConfig = defaultEnv
  ): Promise<APIGatewayProxyResult> {
    setEnv(env);
    return handler(event as unknown as Event, c);
  }
});
