import { OAuth2Client } from 'google-auth-library/build/src/auth/oauth2client';
import type { Email } from '@own-types/model';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function verifyGoogleIdentity(
  userGoogleCode: string,
  config: GoogleOAuthConfig
): Promise<Email> {
  const client = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
  return client.getToken(userGoogleCode).then((tokenResponse) => {
    if (tokenResponse.tokens.id_token) {
      return client
        .verifyIdToken({
          idToken: tokenResponse.tokens.id_token,
          audience: config.clientId
        })
        .then((ticket) => {
          const email = ticket.getPayload()?.['email'];
          if (email) {
            return email;
          } else {
            const msg = 'Email could not be extracted out of Google token id';
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
