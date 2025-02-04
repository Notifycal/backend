import type { AuthorizationForIdp } from '@model/IdpAuthorization';

import type { Identity, IdpName } from '@notifycal/shared/types';

export interface UserCalendar {
  name: string;
  id: string;
}

export interface UserConfig {
  businessName: string;
  businessAddress: string;
  calendars: Array<UserCalendar>;
}

export interface LiveUser<TIdpName extends IdpName> extends Identity<TIdpName> {
  config: UserConfig;
  idpAuthorization: AuthorizationForIdp<TIdpName>;
}
