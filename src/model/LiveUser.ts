import type { AuthorizationForIdp } from '@model/IdpAuthorization';

import type { DateTime, Identity, IdpName, ReminderConfig } from '@notifycal/shared/types';

export interface UserCalendar {
  name: string;
  id: string;
}

export interface LiveUserConfig extends Omit<ReminderConfig, 'confirmation'> {
  confirmation: {
    termsAccepted: DateTime;
    privacyAccepted: DateTime;
    marketingOptInAccepted?: DateTime;
  };
}

export interface LiveUser<TIdpName extends IdpName> extends Identity<TIdpName> {
  config: LiveUserConfig;
  idpAuthorization: AuthorizationForIdp<TIdpName>;
}
