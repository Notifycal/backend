/* eslint-disable camelcase */
import type { Calendar } from '@model/Calendar';
import type { CalendarId, CalendarName } from '@own-types/model';
import { google, type calendar_v3 } from 'googleapis';
import type { GaxiosResponse } from 'googleapis-common';
import type { APIRequestContext } from 'googleapis/build/src/apis/abusiveexperiencereport';
import { describe, expect, it, vi } from 'vitest';
import { GoogleCalendar } from './calendar';

describe('GoogleCalendar Service', () => {
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
        list: vi.fn().mockImplementation(calendarListFn),
        context: {} as APIRequestContext,
        delete: vi.fn(),
        get: vi.fn(),
        insert: vi.fn(),
        patch: vi.fn(),
        update: vi.fn(),
        watch: vi.fn()
      },
      context: {} as APIRequestContext,
      acl: {
        context: {} as APIRequestContext,
        list: vi.fn(),
        delete: vi.fn(),
        get: vi.fn(),
        insert: vi.fn(),
        patch: vi.fn(),
        update: vi.fn(),
        watch: vi.fn()
      },
      calendars: {
        context: {} as APIRequestContext,
        delete: vi.fn(),
        get: vi.fn(),
        insert: vi.fn(),
        patch: vi.fn(),
        update: vi.fn(),
        clear: vi.fn()
      },
      channels: {
        context: {} as APIRequestContext,
        stop: vi.fn()
      },
      colors: {
        context: {} as APIRequestContext,
        get: vi.fn()
      },
      events: {
        context: {} as APIRequestContext,
        list: vi.fn(),
        delete: vi.fn(),
        get: vi.fn(),
        insert: vi.fn(),
        patch: vi.fn(),
        update: vi.fn(),
        watch: vi.fn(),
        import: vi.fn(),
        instances: vi.fn(),
        move: vi.fn(),
        quickAdd: vi.fn()
      },
      freebusy: {
        context: {} as APIRequestContext,
        query: vi.fn()
      },
      settings: {
        context: {} as APIRequestContext,
        list: vi.fn(),
        get: vi.fn(),
        watch: vi.fn()
      }
    });
    const config = { clientId: 'id', clientSecret: 'secret', redirectUri: 'uri' };
    return GoogleCalendar.withRefreshToken(config, '').calendarList();
  }
});
