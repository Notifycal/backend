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

export function fromStoreRecord(contact: SenderContactStoreRecord): SenderContact {
  return match(contact)
    .with({ Type: 'phone' }, (phone) => ({
      type: phone.Type,
      countryCode: phone.CountryCode,
      phoneNumber: phone.PhoneNumber
    }))
    .with({ Type: 'rcs' }, (rcs) => ({
      type: rcs.Type,
      identifier: rcs.Identifier
    }))
    .exhaustive();
}
