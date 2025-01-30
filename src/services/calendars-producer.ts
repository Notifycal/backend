import { BaseProducer, type BaseProducerConfig } from './common/base-producer';

import { SendMessageCommand, SendMessageCommandOutput } from '@aws-sdk/client-sqs';

export type CalendarsProducerConfig = BaseProducerConfig;

export class CalendarsProducer extends BaseProducer<CalendarsProducerConfig> {
  public constructor(config: CalendarsProducerConfig) {
    super(config);
  }

  // Why Promise<null> ?
  public sendCalendarsMessage(messageBody): Promise<null> {
    // TODO: Pass a real "object" with the user + their calendars?
    const sendCmd = new SendMessageCommand({
      QueueUrl: this._queueURL,
      MessageBody: messageBody
    });
    return this._sqsClient.send(sendCmd).then((foo: SendMessageCommandOutput) => {
      console.log(foo);
      return null;
    });
  }
}
