import type { GoogleOAuthConfig } from '@model/Config';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { Email, Identity, IdpId } from '@notifycal/shared/types';
import { throwError } from '@services/common/error-handling';
import { idGenerator } from '@services/id-generator';
import { OAuthBaseGoogle } from './base-service';

export class GoogleOAuth extends OAuthBaseGoogle {
  protected _config: GoogleOAuthConfig;

  protected constructor(config: GoogleOAuthConfig) {
    super(config);
    this._config = config;
  }
  public static withConfig(config: GoogleOAuthConfig): GoogleOAuth {
    return new this(config);
  }

  public verifyIdentity<TIdpName extends 'google.com'>(
    userGoogleCode: string
  ): Promise<[Identity<'google.com'>, AuthorizationForIdp<'google.com'>]> {
    return this._client.getToken(userGoogleCode).then((tokenResponse) => {
      if (!tokenResponse.tokens.id_token) {
        throwError(
          `Google token id was not present in token obtained from Google using user's google code`
        );
      }
      if (!tokenResponse.tokens.refresh_token) {
        throwError(
          `Google refresh token was not present in token obtained from Google using user's google code`
        );
      }
      return this._client
        .verifyIdToken({
          idToken: tokenResponse.tokens.id_token,
          audience: this._config.clientId
        })
        .then((ticket) => {
          const id = ticket.getUserId();
          const email = ticket.getPayload()?.['email'];
          if (!id) {
            throwError(
              `Id could not be extracted out of Google token id. Extracted id: '${id}' and email: '${email}'`
            );
          }
          if (!email) {
            throwError(
              `Email could not be extracted out of Google token id. Extracted id: '${id}' and email: '${email}'`
            );
          }
          if (!ticket.getPayload()?.email_verified) {
            throwError(
              `Google user with id: '${id}' and email: '${email}' isn't verified at google. We cannot let them in.`
            );
          }
          const identity: Identity<'google.com'> = {
            userId: idGenerator(id, 'google.com'),
            email: email as Email,
            idp: 'google.com' as TIdpName,
            idpId: id as IdpId
          };
          const authorization: AuthorizationForIdp<'google.com'> = {
            refreshToken: tokenResponse.tokens.refresh_token as string
          };
          return [identity, authorization];
        });
    });
  }
}
