import { OAuth2Client } from "google-auth-library/build/src/auth/oauth2client";
import { Email } from "types/model";

export function verifyGoogleToken(idToken: string, googleClientId: string): Promise<Email> {
  const client = new OAuth2Client(googleClientId);
  return client
    .verifyIdToken({
      idToken: idToken,
      audience: googleClientId
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
}