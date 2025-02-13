import type { BaseEvent } from '@model/app-events/BaseEvent';
import type { SqsQueueConfig } from '@model/Config';
import { SqsService } from './sqs';

export class DeadLetteringService {
  private readonly _sqsService: SqsService;

  private constructor(service: SqsService) {
    this._sqsService = service;
  }

  public static withConfig(config: SqsQueueConfig): DeadLetteringService {
    return new this(SqsService.withConfig(config));
  }

  public send<TEvent extends BaseEvent>(event: TEvent): Promise<void> {
    return this._sqsService.sendEvent(event).then(() => {});
  }
}
