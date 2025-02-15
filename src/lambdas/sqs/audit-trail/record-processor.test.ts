import { logger } from '@common/powertools';
import type {
  BusinessAddress,
  BusinessName,
  CalendarId,
  CalendarName,
  CorrelationId,
  DateTime,
  EventId,
  IdpId,
  TemplateId,
  UserId
} from '@notifycal/shared/types';
import { AuditTrailBaseStore } from '@services/stores/audit-trail-base-store';
import { describe, expect, it, vi } from 'vitest';
import type { AuditTrailConfig } from './config';
import type { Record } from './index';
import { recordProcessor } from './record-processor';

const validRecord: Record = {
  body: {
    eventId: 'some-event-id' as EventId,
    eventType: 'UserCalendarFetched',
    happenedAt: '2024-01-01T15:00:00Z' as DateTime,
    correlationId: 'test-correlation-id' as CorrelationId,
    userId: 'test-user-id' as UserId,
    idp: 'google.com',
    idpId: 'test-idp-id' as IdpId,
    data: {
      run: {
        lowerBoundStartTime: '2024-01-02T15:00:00Z' as DateTime,
        upperBoundStartTime: '2024-01-02T15:29:59Z' as DateTime,
        slidingWindowInMinutes: 30
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

const defaultConfig: AuditTrailConfig = {
  auditTrailBaseStoreConfig: {
    tableName: 'some-table-name'
  }
};

describe('Audit trail record processor', () => {
  it('should process an event successfully and log the success message', async () => {
    const putSpy = vi.spyOn(AuditTrailBaseStore.prototype, 'put').mockResolvedValue();
    const loggerSpy = vi.spyOn(logger, 'info');

    await testit(validRecord, defaultConfig);

    expect(putSpy).toHaveBeenCalledTimes(1);
    expect(loggerSpy).toHaveBeenCalledWith(
      `Event has been successfully processed. Event id: ${validRecord.body.eventId}`
    );
  });

  it('should throw an error if processing fails', async () => {
    const error = new Error('Boom!');
    const putSpy = vi.spyOn(AuditTrailBaseStore.prototype, 'put').mockRejectedValue(error);

    await expect(testit(validRecord, defaultConfig)).rejects.toThrow(
      `Failed to process event. Event id: ${validRecord.body.eventId}. Error: Boom!`
    );

    expect(putSpy).toHaveBeenCalledTimes(1);
  });
});

function testit(record: Record, config: AuditTrailConfig = defaultConfig): Promise<void> {
  return recordProcessor(record, config);
}
