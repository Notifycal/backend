import type { GoogleOAuthConfig } from '@model/Config';
import type { AuthorizationForIdp } from '@model/IdpAuthorization';
import type { ServiceResponse } from '@model/ServiceResponse';
import type {
  CalendarEvent,
  CalendarId,
  DateTime,
  IdpName,
  TimeZone
} from '@notifycal/shared/types';
import { describe, expect, it, vi } from 'vitest';
import { eventsStartTimeWithin } from './calendar-events';
import { GoogleCalendar } from './google/calendar';

describe('Calendar Events Service', () => {
  const calendarId: CalendarId = 'test-calendar-id' as CalendarId;
  const lowerBoundStartTime: DateTime = '2025-02-01T00:00:00Z' as DateTime;
  const upperBoundStartTime: DateTime = '2025-03-01T00:00:00Z' as DateTime;
  const idpAuthorization: AuthorizationForIdp<IdpName> = {
    refreshToken: 'test-refresh-token'
  };
  const idpConfigs = {
    'google.com': {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'https://example.com/callback'
    } as GoogleOAuthConfig
  };

  it('should fetch calendar events successfully', async () => {
    const mockServiceResponse: ServiceResponse<CalendarEvent> = {
      successList: [
        {
          id: 'event1',
          startTime: '2025-02-15T10:00:00Z' as DateTime,
          timeZone: 'Europe/Madrid' as TimeZone,
          isAllDayEvent: false,
          description: 'someEventDescription',
          attendees: [
            {
              id: 'someIdpIdentifier'
            }
          ]
        }
      ],
      failureList: []
    };

    const result = await testit(() => Promise.resolve(mockServiceResponse));

    expect(result.successList).toHaveLength(1);
    expect(result.successList![0].id).toBe('event1');
    expect(result.failureList).toHaveLength(0);
  });

  it('should passthrough errors from Google Calendar service', () => {
    const error = new Error('Service Error');
    return expect(testit(() => Promise.reject(error))).rejects.toThrow(error);
  });

  it('should return an empty list when no events are found', async () => {
    const result = await testit(() => Promise.resolve({ successList: [], failureList: [] }));

    expect(result.successList).toHaveLength(0);
    expect(result.failureList).toHaveLength(0);
  });

  it('should passthough failures gracefully', async () => {
    const error = new Error('Boom!');
    const result = await testit(() =>
      Promise.resolve({
        successList: [],
        failureList: [error]
      })
    );

    expect(result.successList).toHaveLength(0);
    expect(result.failureList).toHaveLength(1);
    expect(result.failureList[0]).toStrictEqual(error);
  });

  it('should respect the all-day events inclusion flag', async () => {
    const mockServiceResponse: ServiceResponse<CalendarEvent> = {
      successList: [
        {
          id: 'event2',
          startTime: '2025-02-10T00:00:00Z' as DateTime,
          timeZone: 'Europe/Madrid' as TimeZone,
          isAllDayEvent: true,
          description: 'someDescription',
          attendees: [
            {
              id: 'someIdpIdentifier'
            }
          ]
        }
      ],
      failureList: []
    };

    const result = await testit(() => Promise.resolve(mockServiceResponse));

    expect(result.successList).toHaveLength(1);
    expect(result.successList![0].id).toBe('event2');
    expect(result.failureList).toHaveLength(0);
  });

  function testit(
    googleResponseFn: () => Promise<ServiceResponse<CalendarEvent>>,
    includeAllDayEvents: boolean = false
  ) {
    vi.mock('@services/google/calendar');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(GoogleCalendar.withRefreshToken).mockReturnValue({
      eventsStartTimeWithin: vi.fn().mockImplementation(googleResponseFn)
    } as unknown as GoogleCalendar);

    return eventsStartTimeWithin(
      calendarId,
      lowerBoundStartTime,
      upperBoundStartTime,
      includeAllDayEvents,
      idpAuthorization,
      'google.com',
      idpConfigs
    );
  }
});
