/* eslint-disable camelcase */
import type { GoogleOAuthConfig } from '@model/Config';
import type { ServiceResponse } from '@model/ServiceResponse';
import { calendarSchema, calendarEventSchema } from '@notifycal/shared/schemas';
import type {
  Calendar,
  CalendarEvent,
  CalendarId,
  CalendarName,
  DateTime
} from '@notifycal/shared/types';
import { extractErrorMessage, throwError } from '@services/common/error-handling';
import { partitionByError } from '@utils/array';
import { isWithinBoundaries } from '@utils/datetime';
import { google, type calendar_v3 } from 'googleapis';
import { z } from 'zod';
import { BaseGoogle } from './base-service';

export class GoogleCalendar extends BaseGoogle {
  public static withRefreshToken(config: GoogleOAuthConfig, refreshToken: string): GoogleCalendar {
    return new this(config, refreshToken);
  }

  public calendarList(): Promise<Array<Calendar>> {
    return this._calendarList().then((list) => this.toCalendarArray(list));
  }

  public eventsStartTimeWithin(
    calendarId: CalendarId,
    lowerBoundStartTime: DateTime,
    upperBoundStartTime: DateTime,
    includeAllDayEvents: boolean
  ): Promise<ServiceResponse<CalendarEvent>> {
    return this._eventsList(calendarId, lowerBoundStartTime, upperBoundStartTime).then((list) => {
      const transformedList = list.map((e) => this.toCalendarEventEntry(e, calendarId));
      const [successList, failureList] = partitionByError(transformedList);
      const finalList = successList.filter((e) =>
        // In plain language, yield events which start time is within boundaries(inclusive). Also include all day events based on parameter.
        // This is necessary due to Google Calendar API nature to be able to implement sliding windows so that we don't process events twice.
        {
          const _isWithinBoundaries = isWithinBoundaries(
            e.startTime,
            lowerBoundStartTime,
            upperBoundStartTime
          );
          if (e.isAllDayEvent) {
            return includeAllDayEvents && _isWithinBoundaries;
          } else {
            return _isWithinBoundaries;
          }
        }
      );
      if (finalList.length > 0) {
        return { successList: finalList, failureList: failureList };
      } else {
        return { successList: undefined, failureList: failureList };
      }
    });
  }

  private toCalendarEntry(item: calendar_v3.Schema$CalendarListEntry): Partial<Calendar> {
    return {
      id: item.id as CalendarId,
      name: item.summary as CalendarName
    };
  }

  // Docs: it includes events which start time happens between start and end inclusive and all day events too.
  private toCalendarEventEntry(
    item: calendar_v3.Schema$Event,
    calendarId: CalendarId
  ): CalendarEvent | Error {
    try {
      const calendarEvent: Partial<CalendarEvent> = {
        id: item.id ?? undefined,
        description: item.summary ?? undefined,
        ...this.extractDateTime(item.start)
      };
      return calendarEventSchema.parse(calendarEvent);
    } catch (error) {
      const msg = `Parsing error when extracting information out of a Google Calendar Events list. Google calendar id: ${calendarId}. Google event id: ${item.id}. Error: ${extractErrorMessage(error)}`;
      return new Error(msg);
    }
  }

  private extractDateTime(
    start: calendar_v3.Schema$EventDateTime | undefined
  ): Pick<CalendarEvent, 'startTime'> & Pick<CalendarEvent, 'isAllDayEvent'> {
    if (start && start.date) {
      return {
        startTime: new Date(start.date).toISOString() as DateTime,
        isAllDayEvent: true
      };
    }
    if (start && start.dateTime) {
      return {
        startTime: start.dateTime as DateTime,
        isAllDayEvent: false
      };
    }
    throw new Error('Neither .date not dateTime could be read on event.');
  }

  private toCalendarArray(
    list: Array<calendar_v3.Schema$CalendarListEntry>
  ): Promise<Array<Calendar>> {
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
        if (response.status >= 200 && response.status <= 299) {
          return response.data.items || [];
        } else {
          throwError(`${baseMsg}. Error in response: ${JSON.stringify(response)}`);
        }
      })
      .catch((error) => {
        throwError(`${baseMsg}. ${error}`);
      });
  }

  // Gotcha: it returns all day events and events starting before the provided period - unlike the obvious
  private _eventsList(
    calendarId: CalendarId,
    upperBoundStartTime: DateTime,
    lowerBoundEndTime: DateTime
  ): Promise<Array<calendar_v3.Schema$Event>> {
    const baseMsg = 'GET Events List';
    const calendar = google.calendar({ version: 'v3', auth: this._client });
    return calendar.events
      .list({
        calendarId: calendarId,
        timeMax: lowerBoundEndTime,
        timeMin: upperBoundStartTime,
        timeZone: 'UTC'
      })
      .then((response) => {
        if (response.status >= 200 && response.status <= 299) {
          return response.data.items || [];
        } else {
          throwError(`${baseMsg}. Error in response: ${JSON.stringify(response)}`);
        }
      })
      .catch((error) => {
        throwError(`${baseMsg}. ${error}`);
      });
  }
}
