import {
  authWithRefreshToken,
  authWithServiceAccount,
  getCalendarEvents,
  getContact,
  getGoogleCalendars,
  shareCalendar
} from '@services/google/google-calendar';
import { describe, it, expect } from 'vitest';

const SERVICE_ACCOUNT_PATH = '/home/sj11/Documents/notifycal-340d47c3cdb8.service-account.json';
const REFRESH_TOKEN =
  '<OMITTED>'; //notifycal@gmail.com refreshtoken
const SERVICE_ACCOUNT_EMAIL = 'testing@notifycal.iam.gserviceaccount.com';

describe('gcalendar/gcontacts', () => {
  it('gcalendar ok1', async () => {
    const x = await getGoogleCalendars(authWithRefreshToken(REFRESH_TOKEN));

    expect(x).toStrictEqual(x);
  });

  it('gcalendar ok2', async () => {
    const auth = authWithRefreshToken(REFRESH_TOKEN);
    const calendarId =
      'bbf37e0c3b2dbf6fa2a2ada2e2c96c775e4e6987fb8a3bbcbc2f23f84bd3620b@group.calendar.google.com'; //notifycal@gmail.com /TestingSergio calendar
    await shareCalendar(auth, calendarId, SERVICE_ACCOUNT_EMAIL);
    const saAuth = authWithServiceAccount(SERVICE_ACCOUNT_PATH);
    const x = await getCalendarEvents(saAuth, calendarId);

    expect(x).toStrictEqual(x);
  });

  it('gcontacts ok3', async () => {
    const auth = authWithRefreshToken(REFRESH_TOKEN);
    // const auth = authWithServiceAccount(SERVICE_ACCOUNT_PATH);
    const x = await getContact('not used', auth);

    expect(x).toStrictEqual(x);
  });
});
