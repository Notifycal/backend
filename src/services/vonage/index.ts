import { Auth } from '@vonage/auth';
import { RCSText, SMS } from '@vonage/messages';
import { Vonage } from '@vonage/server-sdk';

import { rethrowError } from '@services/common/error-handling';

import type { Logger } from '@aws-lambda-powertools/logger';
import type { ReceiverStandardContact, SenderStandardContact } from '@model/app-events/common';
import type { Brand, Uuid } from '@notifycal/shared/types';
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
    sender: SenderStandardContact,
    receiver: ReceiverStandardContact,
    clientRef: string,
    webhookUrl: Url
  ): Promise<Uuid> {
    const MessageBuilder = match(sender)
      .with({ type: 'phone' }, () => SMS)
      .with({ type: 'rcs' }, () => RCSText)
      .exhaustive();

    try {
      const messageObject = new MessageBuilder({
        to: receiver.phoneNumber,
        from: match(sender)
          .with({ type: 'phone' }, (phone) => phone.phoneNumber)
          .with({ type: 'rcs' }, (rcs) => rcs.identifier)
          .exhaustive(),
        clientRef,
        text: messageBody,
        webhookUrl
      });
      const { messageUUID } = await withIntegrationMetrics('Vonage', 'SendEventReminder', () =>
        this._client.messages.send(messageObject)
      );

      return messageUUID as Uuid;
    } catch (error) {
      rethrowError(`Vonage API failed to send the reminder: ${clientRef}`, error, this.logger);
    }
  }
}
