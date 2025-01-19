import { OAuth2Client } from 'google-auth-library';
import { idGenerator } from './id-generator';
import type { Identity, IdpName } from '@model/Identity';
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
    if (!tokenResponse.tokens.id_token) {
      const msg =
        'Google token id was not present in token obtained from Google using user google,s code';
      throw new Error(msg);
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
          const msg = `Google user with id: '${id}' and email: '${email}' isn't verified at google. We cannot let them in.`;
          throw new Error(msg);
        }
        if (id && email) {
          const idpName: IdpName = 'google.com';
          return {
            userId: idGenerator(id, idpName),
            email: email as Email,
            idp: idpName,
            idpId: id as IdpId
          };
        } else {
          const msg = `Id and/or Email could not be extracted out of Google token id. Extracted id: '${id}' and email: '${email}'`;
          throw new Error(msg);
        }
      });
  });
}
