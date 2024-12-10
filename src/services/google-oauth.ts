import { LoginTicket } from "google-auth-library";
import { OAuth2Client } from "google-auth-library/build/src/auth/oauth2client";

export type email = string;

export function verifyGoogleToken(idToken: string, googleClientId: string): Promise<email> {
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