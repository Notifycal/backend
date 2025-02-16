import { Vonage } from '@vonage/server-sdk';
import { Auth } from '@vonage/auth';
import { RCSText } from '@vonage/messages';

import { extractErrorMessage, throwError } from '@services/common/error-handling';

import type { Brand, PhoneNumber, Uuid } from '@notifycal/shared/types';

export type VonageApplicationId = Brand<string, 'ApplicationId'>;
export type VonagePrivateKey = Brand<string, 'PrivateKey'>;

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
    phoneNumber: PhoneNumber,
    clientRef: string
  ): Promise<Uuid | void> {
    try {
      const { messageUUID } = await this._client.messages.send(
        new RCSText({
          to: phoneNumber,
          from: '',
          clientRef,
          text: messageBody
        })
      );

      return messageUUID as unknown as Uuid;
    } catch (error) {
      throwError(
        `Vonage API failed to send the reminder: ${clientRef}. Error: ${extractErrorMessage(error)}`
      );
    }
  }
}
