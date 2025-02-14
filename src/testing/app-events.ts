import type { UserCalendarFetchedEvent } from '@model/app-events/UserCalendarFetchedEvent';
import type {
  BusinessAddress,
  BusinessName,
  CalendarId,
  CalendarName,
  CorrelationId,
  DateTime,
  EventId,
  IdpId,
  TemplateId,
  UserId
} from '@notifycal/shared/types';

export const userCalendarFetchedEvent: UserCalendarFetchedEvent = {
  eventId: 'c1625a78-7337-4fd8-a6c4-a0afb9c0ceb9' as EventId,
  correlationId: 'c1625a78-7337-4fd8-a6c4-a0afb9c0ceb9' as CorrelationId,
  eventType: 'UserCalendarFetched',
  happenedAt: '2023-01-01T00:00:00Z' as DateTime,
  userId: '96f3d941-1155-4d50-ac5a-19345fb7e9ef' as UserId,
  idp: 'google.com',
  idpId: 'google-123' as IdpId,
  data: {
    run: {
      lowerBoundStartTime: '2023-01-01T00:00:00Z' as DateTime,
      upperBoundStartTime: '2023-01-01T00:29:59Z' as DateTime,
      slidingWindowInMinutes: 30
    },
    calendar: {
      id: 'someCalendarId' as CalendarId,
      name: 'Some Calendar Name' as CalendarName
    },
    template: {
      id: 'some-template-id' as TemplateId,
      fields: {
        business: {
          name: 'SomeBusinessName' as BusinessName,
          address: 'SomeBusinessAddress' as BusinessAddress
        }
      }
    }
  },
  sensitiveData: {
    idpAuthorization: {
      refreshToken: 'some refresh token'
    }
  }
};
