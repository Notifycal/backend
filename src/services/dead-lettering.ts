import type { SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import type { BaseErrorEvent } from '@model/app-events/BaseEvent';
import type { SqsQueueConfig } from '@model/Config';
import { SqsService } from './sqs';
import { metrics } from '@common/powertools';
import { MetricUnit } from '@aws-lambda-powertools/metrics';

export class DeadLetteringService {
  private readonly _sqsService: SqsService;

  private constructor(service: SqsService) {
    this._sqsService = service;
  }

  public static withConfig(config: SqsQueueConfig): DeadLetteringService {
    return new this(SqsService.withConfig(config));
  }

  public send<TEvent extends BaseErrorEvent>(event: TEvent): Promise<SendMessageCommandOutput> {
    metrics.addMetric(`DLQError`, MetricUnit.Count, 1);
    metrics.addMetric(`${event.eventType}Error`, MetricUnit.Count, 1);
    return this._sqsService.send(event);
  }
}
