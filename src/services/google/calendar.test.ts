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
import { fakeIdpConfigs } from '@testing/utils/config';
import { google, type calendar_v3 } from 'googleapis';
import type { GaxiosResponse } from 'googleapis-common';
import { describe, expect, it, vi, type Mock } from 'vitest';
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

    return expect(result).rejects.toThrow(`Error in GET Calendar List`);
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

    return expect(result).rejects.toThrow(`Failed to parse Google Calendar List items with error`);
  });

  function testit(
    calendarListFn: () => Promise<GaxiosResponse<calendar_v3.Schema$CalendarList>>,
    config = fakeIdpConfigs['google.com']
  ): Promise<Array<Calendar>> {
    vi.mock('googleapis');
    vi.mocked(google.calendar).mockReturnValue({
      calendarList: {
        list: vi.fn().mockImplementation(calendarListFn)
      }
    } as unknown as calendar_v3.Calendar);
    return GoogleCalendar.withRefreshToken(config, 'some-refresh-token').calendarList();
  }
});

describe('GoogleCalendar Service eventsWithinPeriod', () => {
  const calendarId: CalendarId = 'test-calendar-id' as CalendarId;
  const lowerBoundStartTime: DateTime = '2025-02-01T00:00:00Z' as DateTime;
  const upperBoundStartTime: DateTime = '2025-03-01T00:00:00Z' as DateTime;

  const validEvent: calendar_v3.Schema$Event = {
    id: 'event1',
    summary: 'Meeting',
    start: { dateTime: '2025-02-15T10:00:00Z', timeZone: 'Europe/Madrid' },
    attendees: [
      {
        email: 'some-attendee1@gmail.com',
        organizer: true
      },
      {
        email: 'some-attendee2@gmail.com'
      }
    ]
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

  it('should fetch events including attendees and excluding organizers successfully', async () => {
    const validEvent2: calendar_v3.Schema$Event = {
      id: 'event2',
      summary: 'Meeting',
      start: { dateTime: '2025-02-15T10:00:00Z', timeZone: 'Europe/Madrid' },
      attendees: [
        {
          email: 'some-attendee11@gmail.com'
        },
        {
          email: 'some-attendee22@gmail.com',
          organizer: true
        }
      ]
    };
    const eventsListFn = vi
      .fn<() => Promise<GaxiosResponse<calendar_v3.Schema$Events>>>()
      .mockResolvedValueOnce({
        data: { items: [validEvent], nextPageToken: 'someToken' },
        status: 200
      } as GaxiosResponse<calendar_v3.Schema$Events>)
      .mockResolvedValueOnce({
        data: { items: [validEvent2] },
        status: 200
      } as GaxiosResponse<calendar_v3.Schema$Events>);

    const result = await testit(eventsListFn);

    expect(eventsListFn).toHaveBeenCalledTimes(2);
    expect(result.successList).toHaveLength(2);
    expect(result.successList[0].id).toBe('event1');
    expect(result.successList[1].id).toBe('event2');
    expect(result.successList[0].attendees).toStrictEqual([
      { id: (validEvent.attendees || [])[1]?.email }
    ]);
    // eslint-disable-next-line vitest/max-expects
    expect(result.successList[1].attendees).toStrictEqual([
      { id: (validEvent2.attendees || [])[0]?.email }
    ]);
  });

  it('should filter out events outside the date bounds', async () => {
    const eventsListFn = vi
      .fn<() => Promise<GaxiosResponse<calendar_v3.Schema$Events>>>()
      .mockResolvedValue({
        data: {
          items: [
            { ...validEvent, start: { dateTime: '2025-01-15T10:00:00Z' } } // Outside bounds
          ]
        },
        status: 200
      } as GaxiosResponse<calendar_v3.Schema$Events>);

    const result = await testit(eventsListFn);

    expect(result.successList).toStrictEqual([]);
  });

  it('should include all-day events if the flag is true', async () => {
    const eventsListFn = vi
      .fn<() => Promise<GaxiosResponse<calendar_v3.Schema$Events>>>()
      .mockResolvedValue({
        data: { items: [validAllDayEvent], timeZone: 'Europe/Madrid' },
        status: 200
      } as GaxiosResponse<calendar_v3.Schema$Events>);

    const result = await testit(eventsListFn, true);

    expect(result.successList).toHaveLength(1);
    expect(result.successList[0].id).toBe('event2');
  });

  it('should exclude all-day events if the flag is false', async () => {
    const eventsListFn = vi
      .fn<() => Promise<GaxiosResponse<calendar_v3.Schema$Events>>>()
      .mockResolvedValue({
        data: { items: [validAllDayEvent], timeZone: 'Europe/Madrid' },
        status: 200
      } as GaxiosResponse<calendar_v3.Schema$Events>);

    const result = await testit(eventsListFn);

    expect(result.successList).toStrictEqual([]);
  });

  it('should handle errors when event parsing fails', async () => {
    const eventsListFn = vi
      .fn<() => Promise<GaxiosResponse<calendar_v3.Schema$Events>>>()
      .mockResolvedValue({
        data: { items: [invalidEvent] },
        status: 200
      } as GaxiosResponse<calendar_v3.Schema$Events>);

    const result = await testit(eventsListFn);

    expect(result.failureList).toHaveLength(1);
    expect(result.failureList[0].message).includes(
      `Parsing error when extracting information out of a Google Calendar Events list. Google calendar id: ${calendarId}. Google event id: ${invalidEvent.id}. Error: Neither .date not dateTime could be read on event.`
    );
  });

  it('should handle an empty event list', async () => {
    const eventsListFn = vi
      .fn<() => Promise<GaxiosResponse<calendar_v3.Schema$Events>>>()
      .mockResolvedValue({
        data: { items: [] },
        status: 200
      } as unknown as GaxiosResponse<calendar_v3.Schema$Events>);

    const result = await testit(eventsListFn);

    expect(result.successList).toStrictEqual([]);
    expect(result.failureList).toHaveLength(0);
  });

  it('should handle a non 200 response from Google API', () => {
    const eventsListFn = vi
      .fn<() => Promise<GaxiosResponse<calendar_v3.Schema$Events>>>()
      .mockResolvedValue({ status: 400 } as GaxiosResponse<calendar_v3.Schema$Events>);

    return expect(testit(eventsListFn)).rejects.toThrow(
      'GET Events List. Error in response page number 0. Response:'
    );
  });

  it('should handle a rejected promise from the Google API', async () => {
    const eventsListFn = vi
      .fn<() => Promise<GaxiosResponse<calendar_v3.Schema$Events>>>()
      .mockRejectedValue(new Error('Google API Error'));

    await expect(testit(eventsListFn)).rejects.toThrow('Google API Error');
  });

  function testit(
    eventsListMock: Mock<() => Promise<GaxiosResponse<calendar_v3.Schema$Events>>>,
    includeAllDayEvents: boolean = false,
    config = fakeIdpConfigs['google.com']
  ): Promise<ServiceResponse<CalendarEvent, ParsingError>> {
    vi.mock('googleapis');
    vi.mocked(google.calendar).mockReturnValue({
      events: {
        list: eventsListMock
      }
    } as unknown as calendar_v3.Calendar);
    return GoogleCalendar.withRefreshToken(config, 'some-refresh-token').eventsStartTimeWithin(
      calendarId,
      lowerBoundStartTime,
      upperBoundStartTime,
      includeAllDayEvents
    );
  }
});
