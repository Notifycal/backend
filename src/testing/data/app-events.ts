import type { NoPhoneNumberForCalendarEventFoundEvent } from '@model/app-events/NoPhoneNumberForCalendarEventFoundEvent';
import type { UserCalendarFetchedEvent } from '@model/app-events/UserCalendarFetchedEvent';
import type {
  AuditTrailStoreRecord,
  AuditTrailStoreRecordOrigin
} from '@model/store/AuditTrailStoreRecord';
import {
  templateMap,
  type BusinessAddress,
  type BusinessName,
  type CalendarId,
  type CalendarName,
  type CorrelationId,
  type DateTime,
  type EventId,
  type IdpId,
  type RCSSenderId,
  type TimeZone,
  type UserId
} from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';

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
    senderDetails: {
      type: 'rcs',
      identifier: 'Notifycal testing' as RCSSenderId
    },
    calendar: {
      id: 'someCalendarId' as CalendarId,
      name: 'Some Calendar Name' as CalendarName
    },
    template: {
      id: templateMap['formal-en-01'].id,
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

export const auditTrailActionableEventFoundEvent: AuditTrailStoreRecord = {
  Data: {
    receiverDetails: {
      type: 'phone',
      phoneNumber: '+34123456789' as PhoneNumberE164,
      countryCode: 'ES'
    },
    run: {
      lowerBoundStartTime: '2023-01-01T00:00:00Z' as DateTime,
      upperBoundStartTime: '2023-01-01T00:29:59Z' as DateTime,
      slidingWindowInMinutes: 30
    },
    calendar: {
      id: 'some calendar id' as CalendarId,
      name: 'some calendar name' as CalendarName
    },
    calendarEvent: {
      id: 'event-1',
      attendees: [{ id: 'attendee@test.com' }],
      isAllDayEvent: false,
      startTime: '2024-01-02T15:05:00Z' as DateTime,
      timeZone: 'Europe/Madrid' as TimeZone
    },
    senderDetails: {
      type: 'phone',
      phoneNumber: '+34666999888' as PhoneNumberE164,
      countryCode: 'ES'
    },
    message: `This is some message`
  },
  CorrelationId: '0de651ef-535e-4d2e-b9ff-7bf43f5aaaaa' as CorrelationId,
  EventId: '0de651ef-535e-4d2e-b9ff-7bf43f5a01ac' as EventId,
  UserId: '0de651ef-535e-4d2e-b9ff-7bf43f5a0000' as UserId,
  Idp: 'google.com',
  IdpId: '45346356356' as IdpId,
  EventType: 'ActionableEventFound',
  HappenedAt: '2024-01-02T15:04:50Z' as DateTime,
  Origin: 'somewhere' as AuditTrailStoreRecordOrigin
};

export const noPhoneNumberForCalendarEventFoundEvent: NoPhoneNumberForCalendarEventFoundEvent = {
  eventId: 'some-event-id' as EventId,
  eventType: 'NoPhoneNumberForCalendarEventFound',
  happenedAt: '2024-01-01T15:00:00Z' as DateTime,
  correlationId: 'test-correlation-id' as CorrelationId,
  userId: 'test-user-id' as UserId,
  idp: 'google.com',
  idpId: 'test-idp-id' as IdpId,
  data: {
    eventIdCause: 'some-cause-event-id' as EventId,
    run: {
      lowerBoundStartTime: '2024-01-02T15:00:00Z' as DateTime,
      upperBoundStartTime: '2024-01-02T15:29:59Z' as DateTime,
      slidingWindowInMinutes: 30
    },
    calendar: {
      id: 'test-calendar-id' as CalendarId,
      name: 'Test Calendar' as CalendarName
    },
    calendarEvent: {
      id: 'event-1',
      attendees: [{ id: 'attendee@test.com' }],
      isAllDayEvent: false,
      startTime: '2024-01-02T15:05:00Z' as DateTime,
      timeZone: 'Europe/Madrid' as TimeZone
    }
  }
};

export const auditTrailNoPhoneNumberForCalendarEventFoundEvent: AuditTrailStoreRecord = {
  EventId: '0de651ef-535e-4d2e-b9ff-7bf43f5a0055' as EventId,
  EventType: 'NoPhoneNumberForCalendarEventFound',
  HappenedAt: '2024-01-02T15:00:00Z' as DateTime,
  CorrelationId: '0de651ef-535e-4d2e-b9ff-7bf43f5a0033' as CorrelationId,
  UserId: '0de651ef-535e-4d2e-b9ff-7bf43f5a0011' as UserId,
  Idp: 'google.com',
  IdpId: '123456789' as IdpId,
  Data: {
    eventIdCause: '0de651ef-535e-4d2e-b9ff-7bf43f5a0099' as EventId,
    run: {
      lowerBoundStartTime: '2024-01-02T15:00:00Z' as DateTime,
      upperBoundStartTime: '2024-01-02T15:29:59Z' as DateTime,
      slidingWindowInMinutes: 30
    },
    calendar: {
      id: 'test-calendar-id' as CalendarId,
      name: 'Test Calendar' as CalendarName
    },
    calendarEvent: {
      id: 'event-1',
      attendees: [{ id: 'attendee@test.com' }],
      isAllDayEvent: false,
      startTime: '2024-01-02T15:05:00Z' as DateTime,
      timeZone: 'Europe/Madrid' as TimeZone
    }
  },
  Origin: 'somewhere' as AuditTrailStoreRecordOrigin
};
