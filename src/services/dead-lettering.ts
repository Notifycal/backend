import type { SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import type { BaseErrorEvent } from '@model/app-events/BaseErrorEvent';
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

  public send<TEvent extends BaseErrorEvent>(event: TEvent): Promise<SendMessageCommandOutput> {
    return this._sqsService.sendEvent(event);
  }
}
