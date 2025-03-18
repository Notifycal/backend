import type { CountryCode, PhoneNumber, RCSSenderId } from '@notifycal/shared/types';

export interface PhoneContactStoreRecord {
  type: 'phone';
  countryCode: CountryCode;
  phoneNumber: PhoneNumber;
}

export interface RcsContactStoreRecord {
  type: 'rcs';
  identifier: RCSSenderId;
}

export type ContactStoreRecord = PhoneContactStoreRecord | RcsContactStoreRecord;
