import { Auth } from '@vonage/auth';
import { RCSText, SMS } from '@vonage/messages';
import { Vonage } from '@vonage/server-sdk';

import { extractErrorMessage, throwError } from '@services/common/error-handling';

import type { MessageReceiver, MessageSender } from '@model/app-events/common';
import type { Brand, Uuid } from '@notifycal/shared/types';
import type { PublicKey, Url } from '@own-types/model';

export type VonageApiKey = Brand<string, 'VonageApiKey'>;
export type VonageApplicationId = Brand<string, 'VonageApplicationId'>;
export type VonagePrivateKey = Brand<string, 'PrivateKey'>;
export type VonagePublicKey = Brand<string, 'PublicKey'> | PublicKey;

export class MessagingService {
  protected _client: Vonage;

  public constructor(applicationId: VonageApplicationId, privateKey: VonagePrivateKey) {
    this._client = new Vonage(
      new Auth({
        privateKey,
        applicationId
      })
    );
  }

  public async sendMessage(
    messageBody: string,
    sender: MessageSender,
    receiver: MessageReceiver,
    clientRef: string,
    webhookUrl: Url
  ): Promise<Uuid> {
    const MessageBuilder = sender.type === 'phone' ? SMS : RCSText;

    try {
      const messageObject = new MessageBuilder({
        to: receiver.identifier,
        from: sender.identifier,
        clientRef,
        text: messageBody,
        webhookUrl
      });
      const { messageUUID } = await this._client.messages.send(messageObject);

      return messageUUID as Uuid;
    } catch (error) {
      throwError(
        `Vonage API failed to send the reminder: ${clientRef}. Error: ${extractErrorMessage(error)}`
      );
    }
  }
}
