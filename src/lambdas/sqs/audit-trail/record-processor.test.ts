import type { Logger } from '@aws-lambda-powertools/logger';
import type { EventBridgeEvent } from '@aws-lambda-powertools/parser/types';
import { logger } from '@common/powertools';
import type { BaseEvent } from '@model/app-events/BaseEvent';
import type { NoPhoneNumberForCalendarEventFoundEvent } from '@model/app-events/NoPhoneNumberForCalendarEventFoundEvent';
import type { BaseStoreConfig } from '@services/common/base-store';
import { AuditTrailBaseStore } from '@services/stores/audit-trail-base-store';
import {
  noPhoneNumberForCalendarEventFoundEvent,
  userCalendarFetchedEvent
} from '@testing/data/app-events';
import { fakeScheduledEventBridgeEvent } from '@testing/data/event-bridge-event';
import { validRecord } from '@testing/data/sqs-events';
import { describe, expect, it, vi } from 'vitest';
import { recordProcessor } from './record-processor';
import type { Record } from './schema';

const validEvent = userCalendarFetchedEvent;

vi.mock('@services/stores/audit-trail-base-store');

describe('Audit trail record processor', () => {
  async function successTest(event: BaseEvent | EventBridgeEvent): Promise<void> {
    const putFn = vi.fn(() => Promise.resolve());
    const loggerSpy = vi.spyOn(logger, 'info').mockReturnThis();
    await testit(validRecord(event), putFn, logger);

    expect(putFn).toHaveBeenCalledTimes(1);
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
    const validErrorEvent: NoPhoneNumberForCalendarEventFoundEvent =
      noPhoneNumberForCalendarEventFoundEvent;
    return successTest(validErrorEvent);
  });

  it('should throw an error if processing fails', async () => {
    const error = new Error('Boom!');
    const putFn = vi.fn(() => Promise.reject(error));

    await expect(testit(validRecord(validEvent), putFn)).rejects.toThrow(`Failed to process event`);

    expect(putFn).toHaveBeenCalledTimes(1);
  });
});

function testit(
  record: Record,
  putFn: () => Promise<void>,
  _logger: Logger = logger
): Promise<void> {
  const auditTrailBaseStoreMock = {
    put: vi.fn().mockImplementation(putFn)
  };
  const x = vi
    // eslint-disable-next-line @typescript-eslint/unbound-method
    .mocked(AuditTrailBaseStore.withConfig)
    .mockReturnValue(auditTrailBaseStoreMock as unknown as AuditTrailBaseStore);
  return recordProcessor(record, new x({} as BaseStoreConfig), _logger);
}
