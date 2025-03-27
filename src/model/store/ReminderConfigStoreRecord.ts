import type {
  BusinessAddress,
  BusinessName,
  CalendarId,
  CalendarName,
  LanguageCode,
  TemplateId
} from '@notifycal/shared/types';
import type { SenderContactStoreRecord } from './ContactDetailsRecordStore';

interface CalendarStoreRecord {
  id: CalendarId;
  name: CalendarName;
  template: {
    id: TemplateId;
    language: LanguageCode;
  };
}

export interface ReminderConfigStoreRecord {
  calendars: Array<CalendarStoreRecord>;
  business: {
    name: BusinessName;
    address: BusinessAddress;
    senderContact: SenderContactStoreRecord;
  };
}
