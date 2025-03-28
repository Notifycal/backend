import type { SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import type { BaseEvent } from '@model/app-events/BaseEvent';
import type { SqsQueueConfig } from '@model/Config';
import { SqsService } from './sqs';

export class AuditTrailService {
  private readonly _sqsService: SqsService;

  private constructor(service: SqsService) {
    this._sqsService = service;
  }

  public static withConfig(config: SqsQueueConfig): AuditTrailService {
    return new this(SqsService.withConfig(config));
  }

  public send<TEvent extends BaseEvent>(event: TEvent): Promise<SendMessageCommandOutput> {
    return this._sqsService.send(event);
  }
}
