/* eslint-disable camelcase */
import { calendarSchema, type Calendar } from '@model/Calendar';
import type { GoogleOAuthConfig } from '@model/Config';
import type { CalendarId, CalendarName } from '@own-types/model';
import { throwError } from '@services/common/error-handling';
import { google, type calendar_v3 } from 'googleapis';
import { z } from 'zod';
import { BaseGoogle } from './base-service';

export class GoogleCalendar extends BaseGoogle {
  public static withRefreshToken(config: GoogleOAuthConfig, refreshToken: string): GoogleCalendar {
    const instance = new this(config);
    instance._client.setCredentials({ refresh_token: refreshToken });
    return instance;
  }

  public calendarList(): Promise<Array<Calendar>> {
    return this._calendarList().then((list) => this.toCalendarArray(list));
  }

  private toCalendarEntry(item: calendar_v3.Schema$CalendarListEntry): Partial<Calendar> {
    return {
      id: item.id as CalendarId,
      name: item.summary as CalendarName
    };
  }

  private toCalendarArray(
    list: Array<calendar_v3.Schema$CalendarListEntry>
  ): Promise<Array<Calendar>> {
    // TODO: Test this in anger
    const transformedList = list.map((i) => this.toCalendarEntry(i));
    const parsingResult = z.array(calendarSchema).safeParse(transformedList);
    if (parsingResult.success) {
      return Promise.resolve(parsingResult.data);
    } else {
      return Promise.reject(
        new Error(
          `Failed to parse Google Calendar List items with error. Error: ${parsingResult.error.toString()}`
        )
      );
    }
  }

  // CalendarEntryList Docs: https://developers.google.com/calendar/api/v3/reference/calendarList#resource
  private _calendarList(): Promise<Array<calendar_v3.Schema$CalendarListEntry>> {
    const baseMsg = 'GET Calendar List';
    const calendar = google.calendar({ version: 'v3', auth: this._client });
    return calendar.calendarList
      .list()
      .then((response) => {
        return response.data.items || [];
      })
      .catch((error) => {
        throwError(`${baseMsg}. ${error}`);
      });
  }
}
