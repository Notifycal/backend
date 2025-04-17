import { type UserIdentity, extractIdentity } from '@model/UserIdentity';
import type {
  IdpName,
  ReminderConfig,
  UnixTimestamp,
  User,
  UserStatus
} from '@notifycal/shared/types';
import { fromStoreRecord } from './ContactDetailsRecordStore';
import type { ReminderConfigStoreRecord } from './ReminderConfigStoreRecord';

export interface UserStoreRecord<TIdpName> extends UserIdentity<TIdpName> {
  LastSignInAt: UnixTimestamp;
  SignedUpAt: UnixTimestamp;
  UserStatus: UserStatus;
  Config?: ReminderConfigStoreRecord;
}

export function extractReminderConfig(config: ReminderConfigStoreRecord): ReminderConfig {
  return {
    calendars: config?.Calendars.map((calendar) => ({
      id: calendar.Id,
      name: calendar.Name,
      template: {
        id: calendar.Template.Id,
        language: calendar.Template.Language
      }
    })),
    business: {
      name: config?.Business.Name,
      address: config?.Business.Address,
      senderContact: fromStoreRecord(config?.Business.SenderContact)
    }
  };
}

export function extractUser<TIdpName extends IdpName>(
  userRecord: UserStoreRecord<TIdpName>
): User<TIdpName> {
  return {
    ...extractIdentity(userRecord),
    lastSignInAt: userRecord.LastSignInAt,
    signedUpAt: userRecord.SignedUpAt,
    userStatus: userRecord.UserStatus,
    config: userRecord.Config ? extractReminderConfig(userRecord.Config) : undefined
  };
}


