import type { Event } from '@lambdas/api/patch-user-profile/index';
import type {
  BusinessAddress,
  BusinessName,
  CalendarId,
  CalendarName,
  DateTime,
  LanguageCode,
  ReminderConfig,
  TemplateId,
  TimeZone
} from '@notifycal/shared/types';
import { DateTime as DT } from 'luxon';
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

export interface ConfirmationStoreRecord {
  TermsAccepted: DateTime;
  PrivacyAccepted: DateTime;
  MarketingOptInAccepted: DateTime | undefined;
}

export interface CompanyIndustryStoreRecord {
  Category: string;
  Subcategory: string;
  CustomIndustry?: string;
}

export interface ReminderConfigStoreRecord {
  Calendars: Array<CalendarStoreRecord>;
  Business: {
    Name: BusinessName;
    Address: BusinessAddress;
    SenderContact: SenderContactStoreRecord;
    Language: LanguageCode;
    TimeZone: TimeZone;
    CompanyIndustry: CompanyIndustryStoreRecord;
    CompanySize: string;
  };
  Confirmation: ConfirmationStoreRecord;
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
      senderContact: fromContactStoreRecord(record.Business.SenderContact),
      language: record.Business.Language,
      timezone: record.Business.TimeZone,
      companyIndustry: {
        category: record.Business.CompanyIndustry.Category,
        subcategory: record.Business.CompanyIndustry.Subcategory,
        customIndustry: record.Business.CompanyIndustry.CustomIndustry
      },
      companySize: record.Business.CompanySize
    },
    confirmation: {
      termsAccepted: record.Confirmation.TermsAccepted,
      privacyAccepted: record.Confirmation.PrivacyAccepted,
      marketingOptInAccepted: record.Confirmation.MarketingOptInAccepted
    }
  };
}

export function toStoreRecord(config: Event['body']): ReminderConfigStoreRecord {
  const now = DT.now().toUTC().toISO() as DateTime;
  return {
    Business: {
      Name: config.business.name,
      Address: config.business.address,
      SenderContact: toContactStoreRecord(config.business.senderContact),
      Language: config.business.language,
      TimeZone: config.business.timezone,
      CompanyIndustry: {
        Category: config.business.companyIndustry.category,
        Subcategory: config.business.companyIndustry.subcategory,
        CustomIndustry: config.business.companyIndustry.customIndustry
      },
      CompanySize: config.business.companySize
    },
    Calendars: config.calendars.map((calendar) => ({
      Id: calendar.id,
      Name: calendar.name,
      Template: {
        Id: calendar.template.id,
        Language: calendar.template.language
      }
    })),
    Confirmation: {
      TermsAccepted: now,
      PrivacyAccepted: now,
      MarketingOptInAccepted: config.confirmation.marketingOptInAccepted ? now : undefined
    }
  };
}
