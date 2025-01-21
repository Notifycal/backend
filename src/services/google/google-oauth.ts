import type { Identity } from '@model/Identity';
import { OAuth2Client } from 'google-auth-library';
import { idGenerator } from '@services/id-generator';
import type { Email, IdpId } from '@own-types/model';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import { throwError } from '@services/common/error-handling';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function verifyGoogleIdentity<TIdpName extends 'google.com'>(
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
