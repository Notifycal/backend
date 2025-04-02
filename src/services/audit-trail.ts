import type { SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import { logger } from '@common/powertools';
import type { BaseEvent, BaseSystemEvent } from '@model/app-events/BaseEvent';
import type { SqsQueueConfig } from '@model/Config';
import { doSafely } from '@utils/promises';
import { SqsService } from './sqs';

export class AuditTrailService {
  private readonly _sqsService: SqsService;

  private constructor(service: SqsService) {
    this._sqsService = service;
  }

  public static withConfig(config: SqsQueueConfig): AuditTrailService {
    return new this(SqsService.withConfig(config));
  }

  private send<TEvent extends BaseEvent | BaseSystemEvent>(
    event: TEvent
  ): Promise<SendMessageCommandOutput> {
    return this._sqsService.send(event);
  }

  public safeSend<TEvent extends BaseEvent | BaseSystemEvent>(event: TEvent): Promise<void> {
    return doSafely(
      () => this.send(event),
      (error: unknown) => {
        logger.error(`Error sending an ${event.eventType} event to Audit Trail`, {
          error,
          errorEvent: event
        });
        logger.info('Moving on after the error...');
      },
      () => {
        logger.info(`Event of type ${event.eventType} was successfully sent to Audit Trail`);
      }
    );
  }
}
