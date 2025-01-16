import { OAuth2Client } from 'google-auth-library';
import { idGenerator } from './id-generator';
import { idp, type Identity } from '@model/Identity';
import type { Email, IdpId } from '@own-types/model';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function verifyGoogleIdentity(
  userGoogleCode: string,
  config: GoogleOAuthConfig
): Promise<Identity> {
  const client = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
  return client.getToken(userGoogleCode).then((tokenResponse) => {
    if (tokenResponse.tokens.id_token) {
      return client
        .verifyIdToken({
          idToken: tokenResponse.tokens.id_token,
          audience: config.clientId
        })
        .then((ticket) => {
          const id = ticket.getUserId();
          const email = ticket.getPayload()?.['email'];
          if (id && email) {
            return {
              userId: idGenerator(id, idp.google),
              email: email as Email,
              idp: idp.google,
              idpId: id as IdpId
            };
          } else {
            const msg = `Id and/or Email could not be extracted out of Google token id. Extracted id: '${id}' and email: '${email}'`;
            throw new Error(msg);
          }
        });
    } else {
      const msg =
        'Google token id was not present in token obtained from Google using user google,s code';
      throw new Error(msg);
    }
  });
}
