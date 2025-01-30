import type { SQSClient } from '@aws-sdk/client-sqs';
import { sqsClient } from '@clients/sqs';

export interface BaseProducerConfig {
  queueURL: string;
}

export abstract class BaseProducer<TConfig extends BaseProducerConfig> {
  protected _sqsClient: SQSClient;
  protected _queueURL: string;

  public constructor(config: TConfig) {
    this._sqsClient = sqsClient;
    this._queueURL = config.queueURL;
  }
}
