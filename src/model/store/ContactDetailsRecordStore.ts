import type { RCSSenderId, SenderContact, SMSSenderId } from '@notifycal/shared/types';
import { match } from 'ts-pattern';

export interface SmsContactStoreRecord {
  Type: 'sms';
  Identifier: SMSSenderId;
}

export interface RcsSenderContactStoreRecord {
  Type: 'rcs';
  Identifier: RCSSenderId;
}

export type SenderContactStoreRecord = SmsContactStoreRecord | RcsSenderContactStoreRecord;

export function toStoreRecord(contact: SenderContact): SenderContactStoreRecord {
  return match(contact)
    .with({ type: 'sms' }, (sms) => ({
      Type: sms.type,
      Identifier: sms.identifier
    }))
    .with({ type: 'rcs' }, (rcs) => ({
      Type: rcs.type,
      Identifier: rcs.identifier
    }))
    .exhaustive();
}

export function fromStoreRecord(contact: SenderContactStoreRecord): SenderContact {
  return match(contact)
    .with({ Type: 'sms' }, (sms) => ({
      type: sms.Type,
      identifier: sms.Identifier
    }))
    .with({ Type: 'rcs' }, (rcs) => ({
      type: rcs.Type,
      identifier: rcs.Identifier
    }))
    .exhaustive();
}
