import { OAuth2Client } from 'google-auth-library';
import { idGenerator } from '../id-generator';
import type { Identity, IdpName } from '@model/Identity';
import type { Email, IdpId } from '@own-types/model';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import { throwError } from '@services/common/error-handling';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function verifyGoogleIdentity(
  userGoogleCode: string,
  config: GoogleOAuthConfig
): Promise<[Identity<'google.com'>, AuthorizationForIdp<'google.com'>]> {
  const client = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
  return client.getToken(userGoogleCode).then((tokenResponse) => {
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
    console.warn(tokenResponse.tokens.refresh_token);
    return client
      .verifyIdToken({
        idToken: tokenResponse.tokens.id_token,
        audience: config.clientId
      })
      .then((ticket) => {
        const id = ticket.getUserId();
        const email = ticket.getPayload()?.['email'];
        if (!ticket.getPayload()?.email_verified || !ticket.getPayload()?.email_verified) {
          throwError(
            `Google user with id: '${id}' and email: '${email}' isn't verified at google. We cannot let them in.`
          );
        }
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
        const idpName: IdpName = 'google.com';
        return [
          {
            userId: idGenerator(id, idpName),
            email: email as Email,
            idp: idpName,
            idpId: id as IdpId
          },
          {
            refreshToken: tokenResponse.tokens.refresh_token as string
          }
        ];
      });
  });
}
