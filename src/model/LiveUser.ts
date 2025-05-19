import type { AuthorizationForIdp } from '@model/IdpAuthorization';

import type {
  DateTime,
  Identity,
  IdpName,
  ReminderConfigTransformed
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

export interface LiveUser<TIdpName extends IdpName> extends Identity<TIdpName> {
  config: ReminderConfigTransformed;
  idpAuthorization: AuthorizationForIdp<TIdpName>;
}
