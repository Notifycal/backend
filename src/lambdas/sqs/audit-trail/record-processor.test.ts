import type { EventBridgeEvent } from '@aws-lambda-powertools/parser/types';
import { logger } from '@common/powertools';
import type { BaseEvent } from '@model/app-events/BaseEvent';
import type { NoPhoneNumberForAttendeeFoundEvent } from '@model/app-events/NoPhoneNumberForAttendeeFoundEvent';
import { AuditTrailBaseStore } from '@services/stores/audit-trail-base-store';
import {
  noPhoneNumberForAttendeeFoundEvent,
  userCalendarFetchedEvent
} from '@testing/data/app-events';
import { fakeScheduledEventBridgeEvent } from '@testing/data/event-bridge-event';
import { validRecord } from '@testing/data/sqs-events';
import { describe, expect, it, vi } from 'vitest';
import type { AuditTrailConfig } from './config';
import { recordProcessor } from './record-processor';
import type { Record } from './schema';

const validEvent = userCalendarFetchedEvent;

const defaultConfig: AuditTrailConfig = {
  auditTrailBaseStoreConfig: {
    tableName: 'some-table-name'
  }
};

describe('Audit trail record processor', () => {
  async function successTest(event: BaseEvent | EventBridgeEvent): Promise<void> {
    const putSpy = vi.spyOn(AuditTrailBaseStore.prototype, 'put').mockResolvedValue();
    const loggerSpy = vi.spyOn(logger, 'info');
    await testit(validRecord(event), defaultConfig);

    expect(putSpy).toHaveBeenCalledTimes(1);
    expect(loggerSpy).toHaveBeenCalledWith(`Event has been successfully processed`, {
      eventId: event ? ('eventId' in event ? event.eventId : event.id) : ''
    });
  }

  // eslint-disable-next-line vitest/expect-expect
  it('should process an event successfully and log the success message', async () => {
    return successTest(validEvent);
  });

  // eslint-disable-next-line vitest/expect-expect
  it('should process an AWS event (coming from DLQ) successfully and log the success message', async () => {
    return successTest(fakeScheduledEventBridgeEvent);
  });

  // eslint-disable-next-line vitest/expect-expect
  it('should process an error event successfully and log the success message', async () => {
    const validErrorEvent: NoPhoneNumberForAttendeeFoundEvent = noPhoneNumberForAttendeeFoundEvent;
    return successTest(validErrorEvent);
  });

  it('should throw an error if processing fails', async () => {
    const error = new Error('Boom!');
    const putSpy = vi.spyOn(AuditTrailBaseStore.prototype, 'put').mockRejectedValue(error);

    await expect(testit(validRecord(validEvent), defaultConfig)).rejects.toThrow(
      `Failed to process event`
    );

    expect(putSpy).toHaveBeenCalledTimes(1);
  });
});

function testit(record: Record, config: AuditTrailConfig = defaultConfig): Promise<void> {
  return recordProcessor(record, config);
}
