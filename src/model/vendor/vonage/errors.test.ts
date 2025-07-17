import type { Uuid } from '@notifycal/shared/types';
import { describe, expect, it } from 'vitest';
import { categorizeError } from './errors';
import type { VonageWebhookMessageStatusPayload } from './schemas';

describe(categorizeError, () => {
  const validMessageUuid = '12345678-1234-5678-9012-123456789012';
  const baseMessage = {
    // eslint-disable-next-line camelcase
    message_uuid: validMessageUuid as Uuid,
    to: '+1234567890',
    from: '+0987654321',
    timestamp: '2023-01-01T00:00:00Z',
    // eslint-disable-next-line camelcase
    client_ref: 'test-ref',
    channel: 'sms' as const
  };

  it('should return "ok" for delivered status', () => {
    const validMessageStatus: VonageWebhookMessageStatusPayload = {
      ...baseMessage,
      status: 'delivered'
    };

    const result = categorizeError(validMessageStatus);

    expect(result).toBe('ok');
  });

  it('should return "ok" for read status', () => {
    const validMessageStatus: VonageWebhookMessageStatusPayload = {
      ...baseMessage,
      channel: 'rcs',
      status: 'read'
    };

    const result = categorizeError(validMessageStatus);

    expect(result).toBe('ok');
  });

  it('should return "notifycal" for error code 1010', () => {
    const validMessageStatus: VonageWebhookMessageStatusPayload = {
      ...baseMessage,
      status: 'rejected',
      error: {
        error: {
          type: 'https://example.com/error',
          title: '1010',
          detail: 'Missing params',
          instance: 'test-instance'
        }
      }
    };

    const result = categorizeError(validMessageStatus);

    expect(result).toBe('notifycal');
  });

  it('should return "vonage" for error code 1000', () => {
    const validMessageStatus: VonageWebhookMessageStatusPayload = {
      ...baseMessage,
      status: 'rejected',
      error: {
        error: {
          type: 'https://example.com/error',
          title: '1000',
          detail: 'Throttled',
          instance: 'test-instance'
        }
      }
    };

    const result = categorizeError(validMessageStatus);

    expect(result).toBe('vonage');
  });

  it('should return "user" for error code 1040', () => {
    const validMessageStatus: VonageWebhookMessageStatusPayload = {
      ...baseMessage,
      status: 'rejected',
      error: {
        error: {
          type: 'https://example.com/error',
          title: '1040',
          detail: 'Invalid message',
          instance: 'test-instance'
        }
      }
    };

    const result = categorizeError(validMessageStatus);

    expect(result).toBe('user');
  });

  it('should return "transient" for error code 1230', () => {
    const validMessageStatus: VonageWebhookMessageStatusPayload = {
      ...baseMessage,
      status: 'rejected',
      error: {
        error: {
          type: 'https://example.com/error',
          title: '1230',
          detail: 'Network Error',
          instance: 'test-instance'
        }
      }
    };

    const result = categorizeError(validMessageStatus);

    expect(result).toBe('transient');
  });

  it('should return "unknown" for non-existent error code', () => {
    const validMessageStatus: VonageWebhookMessageStatusPayload = {
      ...baseMessage,
      status: 'rejected',
      error: {
        error: {
          type: 'https://example.com/error',
          title: '9999',
          detail: 'Unknown error',
          instance: 'test-instance'
        }
      }
    };

    const result = categorizeError(validMessageStatus);

    expect(result).toBe('unknown');
  });

  it('should return "unknown" and log warning when error title is missing', () => {
    const validMessageStatus: VonageWebhookMessageStatusPayload = {
      ...baseMessage,
      status: 'rejected',
      error: {
        error: {
          type: 'https://example.com/error',
          title: '',
          detail: 'No title',
          instance: 'test-instance'
        }
      }
    };

    const result = categorizeError(validMessageStatus);

    expect(result).toBe('unknown');
  });

  it('should return "unknown" and log warning when error object is missing', () => {
    const validMessageStatus: VonageWebhookMessageStatusPayload = {
      ...baseMessage,
      status: 'rejected'
    };

    const result = categorizeError(validMessageStatus);

    expect(result).toBe('unknown');
  });

  it('should return "unknown" and log error when error title is not a number', () => {
    const validMessageStatus: VonageWebhookMessageStatusPayload = {
      ...baseMessage,
      status: 'rejected',
      error: {
        error: {
          type: 'https://example.com/error',
          title: 'not-a-number',
          detail: 'Invalid title',
          instance: 'test-instance'
        }
      }
    };

    const result = categorizeError(validMessageStatus);

    expect(result).toBe('unknown');
  });

  it('should handle error codes with whitespace', () => {
    const validMessageStatus: VonageWebhookMessageStatusPayload = {
      ...baseMessage,
      status: 'rejected',
      error: {
        error: {
          type: 'https://example.com/error',
          title: '  1010  ',
          detail: 'Missing params',
          instance: 'test-instance'
        }
      }
    };

    const result = categorizeError(validMessageStatus);

    expect(result).toBe('notifycal');
  });

  it('should work with undeliverable status', () => {
    const validMessageStatus: VonageWebhookMessageStatusPayload = {
      ...baseMessage,
      status: 'undeliverable',
      error: {
        error: {
          type: 'https://example.com/error',
          title: '1180',
          detail: 'Absent Subscriber Temporary',
          instance: 'test-instance'
        }
      }
    };

    const result = categorizeError(validMessageStatus);

    expect(result).toBe('user');
  });
});
