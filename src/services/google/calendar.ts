/* eslint-disable camelcase */
import { google, type calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { throwError } from '@services/common/error-handling';
import { calendarSchema, type Calendar } from '@model/Calendar';
import { z } from 'zod';
import { BaseGoogle } from './base-service';
import type { GoogleOAuthConfig } from '@model/Config';

export class GoogleCalendar extends BaseGoogle {
  //   public constructor(config: GoogleOAuthConfig, refreshToken: string) {
  //     super(config, refreshToken);
  //   }
  public static withRefreshToken(config: GoogleOAuthConfig, refreshToken: string): GoogleCalendar {
    const client = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);

    client.setCredentials({ refresh_token: refreshToken });
    return new this(client);
  }

  public calendarList(): Promise<Array<Calendar>> {
    return this._calendarList().then((list) => this.toCalendar(list));
  }

  private toCalendar(list: Array<calendar_v3.Schema$CalendarListEntry>): Promise<Array<Calendar>> {
    // TODO: Test this in anger
    return z.array(calendarSchema).promise().parse(list);
    //   const validationResults = list.map((c) => {
    //     const validationResult = calendarSchema.safeParse({
    //       id: c.id,
    //       name: c.summary
    //     });
    //     return validationResult;
    //   });
    //   if (validationResults.every((r) => r.success)) {
    //     return validationResults.map((r) => r.data as z.infer<calendarSchema>);
    //   } else {
    //     return validationResults.filter()
    //   }
  }

  // CalendarEntryList Docs: https://developers.google.com/calendar/api/v3/reference/calendarList#resource
  private _calendarList(): Promise<Array<calendar_v3.Schema$CalendarListEntry>> {
    const baseMsg = 'GET Calendar List';
    const calendar = google.calendar({ version: 'v3', auth: this._auth });
    return calendar.calendarList
      .list()
      .then((response) => {
        console.log(`${baseMsg}. ${JSON.stringify(response)}`);
        return response.data.items || [];
      })
      .catch((error) => {
        throwError(`${baseMsg}. Error: ${error}`);
      });
  }
}
