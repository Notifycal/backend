import type {
  BusinessAddress,
  BusinessName,
  CalendarId,
  CalendarName,
  LanguageCode,
  TemplateId
} from '@notifycal/shared/types';
import type { SenderContactStoreRecord } from './ContactDetailsRecordStore';

export interface TemplateStoreRecord {
  Id: TemplateId;
  Language: LanguageCode;
}

export interface CalendarStoreRecord {
  Id: CalendarId;
  Name: CalendarName;
  Template: TemplateStoreRecord;
}

export interface ReminderConfigStoreRecord {
  Calendars: Array<CalendarStoreRecord>;
  Business: {
    Name: BusinessName;
    Address: BusinessAddress;
    SenderContact: SenderContactStoreRecord;
  };
}
