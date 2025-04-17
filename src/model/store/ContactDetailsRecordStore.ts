import type { CountryCode, PhoneNumber, RCSSenderId, SenderContact } from '@notifycal/shared/types';
import { match } from 'ts-pattern';

export interface PhoneContactStoreRecord {
  Type: 'phone';
  CountryCode: CountryCode;
  PhoneNumber: PhoneNumber;
}

export interface RcsSenderContactStoreRecord {
  Type: 'rcs';
  Identifier: RCSSenderId;
}

export type SenderContactStoreRecord = PhoneContactStoreRecord | RcsSenderContactStoreRecord;

export function toStoreRecord(contact: SenderContact): SenderContactStoreRecord {
  return match(contact)
    .with({ type: 'phone' }, (phone) => ({
      Type: phone.type,
      CountryCode: phone.countryCode,
      PhoneNumber: phone.phoneNumber
    }))
    .with({ type: 'rcs' }, (rcs) => ({
      Type: rcs.type,
      Identifier: rcs.identifier
    }))
    .exhaustive();
}
