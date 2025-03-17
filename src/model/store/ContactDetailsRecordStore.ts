import type { CountryCode, PhoneNumber, RCSId } from '@notifycal/shared/types';

export interface PhoneContactStoreRecord {
  type: 'phone';
  countryCode: CountryCode;
  phoneNumber: PhoneNumber;
}

export interface RcsContactStoreRecord {
  type: 'rcs';
  identifier: RCSId;
}

export type ContactStoreRecord = PhoneContactStoreRecord | RcsContactStoreRecord;
