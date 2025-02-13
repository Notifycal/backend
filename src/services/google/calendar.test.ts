/* eslint-disable camelcase */
import type { ParsingError } from '@model/Errors';
import type { ServiceResponse } from '@model/ServiceResponse';
import type {
  Calendar,
  CalendarEvent,
  CalendarId,
  CalendarName,
  DateTime
} from '@notifycal/shared/types';
import { google, type calendar_v3 } from 'googleapis';
import type { GaxiosResponse } from 'googleapis-common';
import { describe, expect, it, vi } from 'vitest';
import { GoogleCalendar } from './calendar';

describe('GoogleCalendar Service calendarList', () => {
  const validGoogleCalendarListEntry: GaxiosResponse<calendar_v3.Schema$CalendarList> = {
    data: {
      items: [
        { id: '1', summary: 'Calendar 1' },
        { id: '2', summary: 'Calendar 2' }
      ]
    },
    config: {},
    status: 200,
    statusText: '200OK',
    headers: {},
    request: {
      responseURL: ''
    }
  };

  it('should fetch the calendar list and return parsed data', () => {
    const calendarListFn = () => Promise.resolve(validGoogleCalendarListEntry);

    return testit(calendarListFn).then((result) => {
      expect(result).toStrictEqual([
        { id: '1' as CalendarId, name: 'Calendar 1' as CalendarName },
        { id: '2' as CalendarId, name: 'Calendar 2' as CalendarName }
      ]);
    });
  });

  it('should throw an error if the calendar API fails', () => {
    const error = new Error('Boom! Google API Failure');
    const calendarListFn = () => Promise.reject(error);

    const result = testit(calendarListFn);

    return expect(result).rejects.toThrow(error.message);
  });

  it('should throw a custom error if parsing fails', () => {
    const invalidGoogleCalendarListEntry: GaxiosResponse<calendar_v3.Schema$CalendarList> = {
      data: {
        items: [{ summary: 'Calendar 1' }, { id: '2' }]
      },
      config: {},
      status: 200,
      statusText: '200OK',
      headers: {},
      request: {
        responseURL: ''
      }
    };
    const calendarListFn = () => Promise.resolve(invalidGoogleCalendarListEntry);

    const result = testit(calendarListFn);

    return expect(result).rejects
      .toThrow(`Failed to parse Google Calendar List items with error. Error: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": [
      0,
      "id"
    ],
    "message": "Required"
  },
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": [
      1,
      "name"
    ],
    "message": "Required"
  }
]`);
  });

  function testit(
    calendarListFn: () => Promise<GaxiosResponse<calendar_v3.Schema$CalendarList>>
  ): Promise<Array<Calendar>> {
    vi.mock('googleapis');
    vi.mocked(google.calendar).mockReturnValue({
      calendarList: {
        list: vi.fn().mockImplementation(calendarListFn)
      }
    } as unknown as calendar_v3.Calendar);
    const config = { clientId: 'id', clientSecret: 'secret', redirectUri: 'uri' };
    return GoogleCalendar.withRefreshToken(config, '').calendarList();
  }
});

describe('GoogleCalendar Service eventsWithinPeriod', () => {
  const calendarId: CalendarId = 'test-calendar-id' as CalendarId;
  const lowerBoundStartTime: DateTime = '2025-02-01T00:00:00Z' as DateTime;
  const upperBoundStartTime: DateTime = '2025-03-01T00:00:00Z' as DateTime;

  const validEvent: calendar_v3.Schema$Event = {
    id: 'event1',
    summary: 'Meeting',
    start: { dateTime: '2025-02-15T10:00:00Z', timeZone: 'Europe/Madrid' }
  };

  const validAllDayEvent: calendar_v3.Schema$Event = {
    id: 'event2',
    summary: 'Holiday',
    start: { date: '2025-02-20' }
  };

  const invalidEvent: calendar_v3.Schema$Event = {
    id: 'event3',
    start: {}
  };

  it('should fetch events successfully', async () => {
    const eventsListFn = () =>
      Promise.resolve({ data: { items: [validEvent] }, status: 200 } as GaxiosResponse);

    const result = await testit(eventsListFn);

    expect(result.successList).toHaveLength(1);
    expect(result.successList![0].id).toBe('event1');
  });

  it('should filter out events outside the date bounds', async () => {
    const eventsListFn = () =>
      Promise.resolve({
        data: {
          items: [
            { ...validEvent, start: { dateTime: '2025-01-15T10:00:00Z' } } // Outside bounds
          ]
        },
        status: 200
      } as GaxiosResponse);

    const result = await testit(eventsListFn);

    expect(result.successList).toBeUndefined();
  });

  it('should include all-day events if the flag is true', async () => {
    const eventsListFn = () =>
      Promise.resolve({
        data: { items: [validAllDayEvent], timeZone: 'Europe/Madrid' },
        status: 200
      } as GaxiosResponse);

    const result = await testit(eventsListFn, true);

    expect(result.successList).toHaveLength(1);
    expect(result.successList![0].id).toBe('event2');
  });

  it('should exclude all-day events if the flag is false', async () => {
    const eventsListFn = () =>
      Promise.resolve({
        data: { items: [validAllDayEvent], timeZone: 'Europe/Madrid' },
        status: 200
      } as GaxiosResponse);

    const result = await testit(eventsListFn);

    expect(result.successList).toBeUndefined();
  });

  it('should handle errors when event parsing fails', async () => {
    const eventsListFn = () =>
      Promise.resolve({ data: { items: [invalidEvent] }, status: 200 } as GaxiosResponse);

    const result = await testit(eventsListFn);

    expect(result.failureList).toHaveLength(1);
    expect(result.failureList[0].message).includes(
      `Parsing error when extracting information out of a Google Calendar Events list. Google calendar id: ${calendarId}. Google event id: ${invalidEvent.id}. Error: Neither .date not dateTime could be read on event.`
    );
  });

  it('should handle an empty event list', async () => {
    const eventsListFn = () =>
      Promise.resolve({ data: { items: [] }, status: 200 } as GaxiosResponse);

    const result = await testit(eventsListFn);

    expect(result.successList).toBeUndefined();
    expect(result.failureList).toHaveLength(0);
  });

  it('should handle a non 200 response from Google API', () => {
    const eventsListFn = () => Promise.resolve({ status: 400 } as GaxiosResponse);

    return expect(testit(eventsListFn)).rejects.toThrow(
      'GET Events List. Error: GET Events List. Error in response: {"status":400}'
    );
  });

  it('should handle a rejected promise from the Google API', async () => {
    const eventsListFn = () => Promise.reject(new Error('Google API Error'));

    await expect(testit(eventsListFn)).rejects.toThrow('Google API Error');
  });

  function testit(
    eventsListFn: () => Promise<GaxiosResponse<calendar_v3.Schema$Events>>,
    includeAllDayEvents: boolean = false
  ): Promise<ServiceResponse<CalendarEvent, ParsingError>> {
    vi.mock('googleapis');
    vi.mocked(google.calendar).mockReturnValue({
      events: {
        list: vi.fn().mockImplementation(eventsListFn)
      }
    } as unknown as calendar_v3.Calendar);
    const config = { clientId: 'id', clientSecret: 'secret', redirectUri: 'uri' };
    return GoogleCalendar.withRefreshToken(config, '').eventsStartTimeWithin(
      calendarId,
      lowerBoundStartTime,
      upperBoundStartTime,
      includeAllDayEvents
    );
  }
});
