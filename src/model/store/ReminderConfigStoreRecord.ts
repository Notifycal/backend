import type {
  BusinessAddress,
  BusinessName,
  CalendarId,
  CalendarName,
  LanguageCode,
  ReminderConfig,
  TemplateId
} from '@notifycal/shared/types';
import {
  fromStoreRecord as fromContactStoreRecord,
  toStoreRecord as toContactStoreRecord,
  type SenderContactStoreRecord
} from './ContactDetailsRecordStore';

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

export function fromStoreRecord(record: ReminderConfigStoreRecord): ReminderConfig {
  return {
    calendars: record.Calendars.map((calendar) => ({
      id: calendar.Id,
      name: calendar.Name,
      template: {
        id: calendar.Template.Id,
        language: calendar.Template.Language
      }
    })),
    business: {
      name: record.Business.Name,
      address: record.Business.Address,
      senderContact: fromContactStoreRecord(record.Business.SenderContact)
    }
  };
}

export function toStoreRecord(config: ReminderConfig): ReminderConfigStoreRecord {
  return {
    Business: {
      Name: config.business.name,
      Address: config.business.address,
      SenderContact: toContactStoreRecord(config.business.senderContact)
    },
    Calendars: config.calendars.map((calendar) => ({
      Id: calendar.id,
      Name: calendar.name,
      Template: {
        Id: calendar.template.id,
        Language: calendar.template.language
      }
    }))
  };
}
