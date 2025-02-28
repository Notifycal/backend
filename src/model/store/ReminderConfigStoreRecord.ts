import type {
  BusinessAddress,
  BusinessName,
  CalendarId,
  CalendarName,
  TemplateId
} from '@notifycal/shared/types';
import type { ContactStoreRecord } from './ContactDetailsRecordStore';

interface CalendarStoreRecord {
  id: CalendarId;
  name: CalendarName;
  templateId: TemplateId;
}

export interface ReminderConfigStoreRecord {
  calendars: Array<CalendarStoreRecord>;
  business: {
    name: BusinessName;
    address: BusinessAddress;
    contactDetails: ContactStoreRecord;
  };
}
