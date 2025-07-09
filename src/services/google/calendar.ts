import type { GaxiosResponse } from 'gaxios';
/* eslint-disable camelcase */
import type { Logger } from '@aws-lambda-powertools/logger';
import type { GoogleOAuthConfig } from '@model/Config';
import { ParsingError } from '@model/Errors';
import type { ServiceResponse } from '@model/ServiceResponse';
import { calendarEventSchema, calendarSchema } from '@notifycal/shared/schemas';
import type {
  Calendar,
  CalendarEvent,
  CalendarId,
  CalendarName,
  DateTime,
  TimeZone
} from '@notifycal/shared/types';
import type { JsonObject } from '@own-types/model';
import { extractErrorMessage, rethrowError, throwError } from '@services/common/error-handling';
import { withIntegrationMetrics } from '@services/observability/metrics';
import { partitionByError } from '@utils/array';
import { isWithinBoundaries } from '@utils/datetime';
import { google, type calendar_v3 } from 'googleapis';
import { z } from 'zod';
import { BaseGoogle } from './base-service';

export class GoogleCalendar extends BaseGoogle {
  public static withRefreshToken(
    config: GoogleOAuthConfig,
    refreshToken: string,
    logger: Logger
  ): GoogleCalendar {
    return new this(config, logger, { refreshToken });
  }

  public calendarList(): Promise<Array<Calendar>> {
    return this._calendarList().then((list) => this.toCalendarArray(list));
  }

  public eventsStartTimeWithin(
    calendarId: CalendarId,
    lowerBoundStartTime: DateTime,
    upperBoundStartTime: DateTime,
    includeAllDayEvents: boolean
  ): Promise<ServiceResponse<CalendarEvent, ParsingError>> {
    return this._eventsList(calendarId, lowerBoundStartTime, upperBoundStartTime).then((list) => {
      const transformedList = (list.items || []).map((e) =>
        this.toCalendarEventEntry(e, calendarId, list.timeZone || undefined)
      );
      const [successList, failureList] = partitionByError<CalendarEvent, ParsingError>(
        transformedList
      );
      const finalSuccessList = successList.filter((e) =>
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
      return { successList: finalSuccessList, failureList: failureList };
    });
  }

  private toCalendarEntry(item: calendar_v3.Schema$CalendarListEntry): Partial<Calendar> {
    return {
      id: item.id as CalendarId,
      name: item.summary as CalendarName
    };
  }

  // Docs: it includes events which start time happens between start and end inclusive and all day events too.
  public toCalendarEventEntry(
    item: calendar_v3.Schema$Event,
    calendarId: CalendarId,
    calendarTimezone: string | undefined
  ): CalendarEvent | ParsingError {
    try {
      const timeZone =
        (item.start?.timeZone as TimeZone) ??
        (typeof calendarTimezone === 'string' ? (calendarTimezone as TimeZone) : undefined);
      const calendarEvent: Partial<CalendarEvent> = {
        ...(item.id && { id: item.id }),
        summary: item.summary ?? undefined,
        description: item.description ?? undefined,
        attendees: (item.attendees || [])
          .filter((attendee) => !attendee.organizer)
          .map((attendee) => ({
            id: attendee.email as string // if null or undefined it will be caught later on parsing
          })),
        timeZone: timeZone,
        ...this.extractDateTime(item.start)
      };
      return calendarEventSchema.parse(calendarEvent);
    } catch (error) {
      const msg = `Parsing error when extracting information out of a Google Calendar Events list. Google calendar id: ${calendarId}. Google event id: ${item.id}. Error: ${extractErrorMessage(error)}`;
      return new ParsingError(msg, JSON.parse(JSON.stringify(item)) as JsonObject);
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
        new Error(`Failed to parse Google Calendar List items with error`, {
          cause: parsingResult.error
        })
      );
    }
  }

  // CalendarEntryList Docs: https://developers.google.com/calendar/api/v3/reference/calendarList#resource
  private _calendarList(): Promise<Array<calendar_v3.Schema$CalendarListEntry>> {
    const operationId = 'GET Calendar List';
    const calendar = google.calendar({ version: 'v3', auth: this._client });
    return withIntegrationMetrics('google.com', operationId, () => calendar.calendarList.list())
      .then((response) => {
        if (response.status >= 200 && response.status <= 299) {
          return response.data.items || [];
        } else {
          throwError(`${operationId}. Error in response`, this.logger, { response });
        }
      })
      .catch((error) => {
        rethrowError(`Error in ` + operationId, error, this.logger);
      });
  }

  // Gotcha: it returns all day events and events starting before the provided period - unlike the obvious
  private _eventsList(
    calendarId: CalendarId,
    upperBoundStartTime: DateTime,
    lowerBoundEndTime: DateTime
  ): Promise<calendar_v3.Schema$Events> {
    const operationId = 'GET Events List';
    const calendar = google.calendar({ version: 'v3', auth: this._client });
    const pageNumber = 0;
    const _logger = this.logger;

    function handleResponse(
      response: GaxiosResponse<calendar_v3.Schema$Events>
    ): calendar_v3.Schema$Events {
      if (response.status >= 200 && response.status <= 299) {
        return response.data;
      }
      throwError(
        `${operationId}. Error in response page number ${pageNumber}. Response:`,
        _logger,
        { response }
      );
    }

    function fetchEvents(currentPageToken?: string): Promise<calendar_v3.Schema$Events> {
      return withIntegrationMetrics('google.com', operationId, () =>
        calendar.events.list({
          calendarId,
          timeMax: lowerBoundEndTime,
          timeMin: upperBoundStartTime,
          timeZone: 'UTC',
          ...(currentPageToken && { pageToken: currentPageToken })
        })
      )
        .then(handleResponse)
        .then((events) => {
          if (!events.nextPageToken) {
            return events;
          }
          return fetchEvents(events.nextPageToken).then((newEvents) => {
            events.items = (events.items || []).concat(newEvents.items || []);
            return events;
          });
        });
    }

    return fetchEvents();
  }
}
