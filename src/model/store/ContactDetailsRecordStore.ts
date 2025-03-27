import type { CountryCode, PhoneNumber, RCSSenderId } from '@notifycal/shared/types';

export interface PhoneContactStoreRecord {
  type: 'phone';
  countryCode: CountryCode;
  phoneNumber: PhoneNumber;
}

export interface RcsSenderContactStoreRecord {
  type: 'rcs';
  identifier: RCSSenderId;
}

export type SenderContactStoreRecord = PhoneContactStoreRecord | RcsSenderContactStoreRecord;
