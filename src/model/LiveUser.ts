import type { AuthorizationForIdp } from '@model/IdpAuthorization';

import type {
  DateTime,
  IdpName,
  ReminderConfigTransformed,
  UserIdentity
} from '@notifycal/shared/types';

export interface UserCalendar {
  name: string;
  id: string;
}

export interface LiveUserConfig extends Omit<ReminderConfigTransformed, 'confirmation'> {
  confirmation: {
    termsAccepted: DateTime;
    privacyAccepted: DateTime;
    marketingOptInAccepted: DateTime | undefined;
  };
}

export interface LiveUser<TIdpName extends IdpName> extends UserIdentity<TIdpName> {
  config: ReminderConfigTransformed;
  idpAuthorization: AuthorizationForIdp<TIdpName>;
}
