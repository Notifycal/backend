/* eslint-disable camelcase */
import { google, type calendar_v3 } from 'googleapis';
import { type GoogleAuth, OAuth2Client } from 'google-auth-library';
import type { JSONClient } from 'google-auth-library/build/src/auth/googleauth';
import { throwError } from '@services/common/error-handling';

const CLIENT_ID = '658640078137-omuaokg6rcajv50879674moielbpvljl.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:5173';

export function authWithRefreshToken(refreshToken: string): OAuth2Client {
  const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export function authWithServiceAccount(serviceAccountFile: string): GoogleAuth<JSONClient> {
  return new google.auth.GoogleAuth({
    keyFile: serviceAccountFile,
    scopes: ['https://www.googleapis.com/auth/calendar']
  });
}

export function getGoogleCalendars(
  oauth: OAuth2Client | GoogleAuth<JSONClient>
): Promise<Array<calendar_v3.Schema$CalendarListEntry>> {
  const calendar = google.calendar({ version: 'v3', auth: oauth });
  return calendar.calendarList
    .list()
    .then((response) => {
      console.log(`Response GET calendar list: ${JSON.stringify(response)}`);
      const calendars = response.data.items;
      return calendars || [];
    })
    .catch((error) => {
      throwError(`GET calendar list. Error: ${error}`);
    });
}

export function getCalendarEvents(
  oauth: OAuth2Client | GoogleAuth<JSONClient>,
  calendarId: string
): Promise<unknown> {
  const calendar = google.calendar({ version: 'v3', auth: oauth });
  return calendar.events
    .list({ calendarId: calendarId })
    .then((response) => {
      console.log(`GET Calendar/${calendarId}/events: ${JSON.stringify(response)}`);
      const events = response.data.items;
      return events || [];
    })
    .catch((error) => {
      throwError(`GET calendar/${calendarId}/events. Error: ${error}`);
    });
}

export async function shareCalendar(
  auth: OAuth2Client,
  calendarId: string,
  sharingEmail: string
): Promise<calendar_v3.Schema$AclRule> {
  const aclRule = {
    role: 'reader',
    scope: {
      type: 'user',
      value: sharingEmail
    }
  };
  const calendar = google.calendar({ version: 'v3', auth: auth });
  return calendar.acl
    .insert({
      calendarId,
      requestBody: aclRule
    })
    .then((response) => {
      console.log(
        `PUT Calendar ${calendarId} ACL Rule for user ${sharingEmail} response: ${JSON.stringify(response)}`
      );
      const aclRule = response.data;
      return aclRule;
    })
    .catch((error) => {
      throwError(`PUT Calendar ${calendarId} ACL Rule for user ${sharingEmail}. Error: ${error}`);
    });
}
