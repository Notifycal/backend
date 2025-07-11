import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
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
  type TemplateId,
  type TimeZone,
  type UserId
} from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';

export const userCalendarFetchedEvent: UserCalendarFetchedEvent = {
  eventId: 'c1625a78-7337-4fd8-a6c4-a0afb9c0ceb9' as EventId,
  correlationId: 'c1625a78-7337-4fd8-a6c4-a0afb9c0ceb9' as CorrelationId,
  eventType: 'UserCalendarFetched',
  happenedAt: '2025-05-09T13:00:00Z' as DateTime,
  userId: 'b150d276-e327-51fb-b455-34a87c1c8ecc' as UserId,
  idp: 'google.com',
  idpId: '123456789' as IdpId,
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
      id: templateMap['formal-en-01']?.id ?? ('formal-en-01' as TemplateId),
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

export const validActionableEventEvent: ActionableEventFoundEvent = {
  data: {
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
  correlationId: '0de651ef-535e-4d2e-b9ff-7bf43f5aaaaa' as CorrelationId,
  eventId: '0de651ef-535e-4d2e-b9ff-7bf43f5a01ac' as EventId,
  userId: 'b150d276-e327-51fb-b455-34a87c1c8ecc' as UserId,
  idp: 'google.com',
  idpId: '123456789' as IdpId,
  eventType: 'ActionableEventFound',
  happenedAt: '2025-05-09T13:00:00Z' as DateTime
};

export const noPhoneNumberForCalendarEventFoundEvent: NoPhoneNumberForCalendarEventFoundEvent = {
  eventId: '0de651ef-535e-4d2e-b9ff-7bf43f5a0000' as EventId,
  eventType: 'NoPhoneNumberForCalendarEventFound',
  happenedAt: '2025-05-09T13:00:00Z' as DateTime,
  correlationId: '0de651ef-535e-4d2e-b9ff-7bf43f5a0000' as CorrelationId,
  userId: 'b150d276-e327-51fb-b455-34a87c1c8ecc' as UserId,
  idp: 'google.com',
  idpId: '123456789' as IdpId,
  data: {
    eventIdCause: '0de651ef-535e-4d2e-b9ff-7bf43f5a0000' as EventId,
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
      attendees: [{ id: 'sergio.anger@gmail.com' }],
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

export const lowCreditsDetectedEvent: AuditTrailStoreRecord = {
  Data: {
    originalEvent: validActionableEventEvent.data,
    error: { message: 'Low credits detected' }
  },
  CorrelationId: '0de651ef-535e-4d2e-b9ff-7bf43f5aaaaa' as CorrelationId,
  EventId: '0de651ef-535e-4d2e-b9ff-7bf43f5a01ac' as EventId,
  UserId: '0de651ef-535e-4d2e-b9ff-7bf43f5a0000' as UserId,
  Idp: 'google.com',
  IdpId: '45346356356' as IdpId,
  EventType: 'LowCreditsDetected',
  HappenedAt: '2024-01-02T15:04:50Z' as DateTime,
  Origin: 'somewhere' as AuditTrailStoreRecordOrigin
};

export const insufficientCreditsReminderNotSentEvent: AuditTrailStoreRecord = {
  Data: {
    originalEvent: validActionableEventEvent.data,
    error: { message: 'Insufficient credit reminder not sent' }
  },
  CorrelationId: '0de651ef-535e-4d2e-b9ff-7bf43f5aaaab' as CorrelationId,
  EventId: '0de651ef-535e-4d2e-b9ff-7bf43f5a01ab' as EventId,
  UserId: '0de651ef-535e-4d2e-b9ff-7bf43f5a0001' as UserId,
  Idp: 'google.com',
  IdpId: '45346356357' as IdpId,
  EventType: 'InsufficientCreditsReminderNotSent',
  HappenedAt: '2024-01-02T15:04:51Z' as DateTime,
  Origin: 'somewhere' as AuditTrailStoreRecordOrigin
};
