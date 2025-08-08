import { Auth } from '@vonage/auth';
import { Channels, MessageTypes, RCSText, SMS } from '@vonage/messages';
import { Vonage } from '@vonage/server-sdk';

import { rethrowError } from '@services/common/error-handling';

import type { Logger } from '@aws-lambda-powertools/logger';
import type { ReceiverStandardContact } from '@model/app-events/common';
import type { Brand, SenderContact, Uuid } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { withIntegrationMetrics } from '@services/observability/metrics';
import { match } from 'ts-pattern';

export type VonageApiKey = Brand<string, 'VonageApiKey'>;
export type VonageApplicationId = Brand<string, 'VonageApplicationId'>;
export type VonagePrivateKey = Brand<string, 'PrivateKey'>;
export type VonageJwtSigningSecret = Brand<string, 'JwtSigningSecret'>;

export class VonageMessagingService {
  protected _client: Vonage;

  public constructor(
    applicationId: VonageApplicationId,
    privateKey: VonagePrivateKey,
    private readonly logger: Logger
  ) {
    this._client = new Vonage(
      new Auth({
        privateKey,
        applicationId
      })
    );
  }

  public async sendMessage(
    messageBody: string,
    sender: SenderContact,
    receiver: ReceiverStandardContact,
    clientRef: string,
    webhookUrl: Url
  ): Promise<Uuid> {
    try {
      const baseConfig = {
        to: receiver.phoneNumber,
        from: sender.identifier,
        clientRef,
        text: messageBody,
        webhookUrl
      };
      const messageObject = match(sender)
        .with(
          { type: 'sms' },
          () =>
            new SMS({
              ...baseConfig,
              channel: Channels.SMS,
              messageType: MessageTypes.TEXT
            })
        )
        .with({ type: 'rcs' }, () => new RCSText(baseConfig))
        .exhaustive();
      const { messageUUID } = await withIntegrationMetrics('Vonage', 'SendEventReminder', () =>
        this._client.messages.send(messageObject)
      );

      return messageUUID as Uuid;
    } catch (error) {
      rethrowError(`Vonage API failed to send the reminder: ${clientRef}`, error, this.logger);
    }
  }
}
