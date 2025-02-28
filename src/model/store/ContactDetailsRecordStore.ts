import type { PhoneNumber, RCSSenderId } from '@notifycal/shared/types';

export interface PhoneContactStoreRecord {
  type: 'phone';
  identifier: PhoneNumber;
}

export interface RcsContactStoreRecord {
  type: 'rcs';
  identifier: RCSSenderId;
}

export type ContactStoreRecord = PhoneContactStoreRecord | RcsContactStoreRecord;
