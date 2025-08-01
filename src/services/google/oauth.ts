import type { Logger } from '@aws-lambda-powertools/logger';
import type { GoogleOAuthConfig } from '@model/Config';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { Email, IdpId, UserIdentity } from '@notifycal/shared/types';
import type { Url } from '@own-types/model';
import { throwError } from '@services/common/error-handling';
import { idGenerator } from '@services/id-generator';
import { withIntegrationMetrics } from '@services/observability/metrics';
import { BaseGoogle } from './base-service';

export class GoogleOAuth extends BaseGoogle {
  public static withConfig(
    config: GoogleOAuthConfig,
    originHeaderValue: Url,
    logger: Logger
  ): GoogleOAuth {
    return new this(config, logger, { originHeaderValue });
  }

  public verifyIdentity<TIdpName extends 'google.com'>(
    userGoogleCode: string
  ): Promise<[UserIdentity<'google.com'>, AuthorizationForIdp<'google.com'>]> {
    const getTokenrestResourceName = 'GET Token response';
    return withIntegrationMetrics('google.com', getTokenrestResourceName, () =>
      this._client.getToken(userGoogleCode)
    ).then((tokenResponse) => {
      if (!tokenResponse.tokens.id_token) {
        throwError(
          `Google token id was not present in token obtained from Google using user's google code`,
          this.logger,
          { tokenResponse }
        );
      }
      if (!tokenResponse.tokens.refresh_token) {
        throwError(
          `Google refresh token was not present in token obtained from Google using user's google code`,
          this.logger,
          { tokenResponse }
        );
      }
      const idToken = tokenResponse.tokens.id_token;
      const verifyIdTokenrestResourceName = 'Verify ID token';
      return withIntegrationMetrics('google.com', verifyIdTokenrestResourceName, () =>
        this._client.verifyIdToken({
          idToken: idToken,
          audience: this._config.clientId
        })
      ).then((ticket) => {
        const id = ticket.getUserId();
        const email = ticket.getPayload()?.['email'];
        if (!id) {
          throwError(
            `Id could not be extracted out of Google token id. Extracted id: '${id}' and email: '${email}'`,
            this.logger,
            { ticket }
          );
        }
        if (!email) {
          throwError(
            `Email could not be extracted out of Google token id. Extracted id: '${id}' and email: '${email}'`,
            this.logger,
            { ticket }
          );
        }
        if (!ticket.getPayload()?.email_verified) {
          throwError(
            `Google user with id: '${id}' and email: '${email}' isn't verified at google. We cannot let them in.`,
            this.logger,
            { ticket }
          );
        }
        const userIdentity: UserIdentity<'google.com'> = {
          userId: idGenerator(id, 'google.com'),
          email: email as Email,
          idp: 'google.com' as TIdpName,
          idpId: id as IdpId
        };
        const authorization: AuthorizationForIdp<'google.com'> = {
          refreshToken: tokenResponse.tokens.refresh_token as string
        };
        return [userIdentity, authorization];
      });
    });
  }
}
