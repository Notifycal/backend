import type { LanguageCode } from '@notifycal/shared/types';
import type { NotifycalTranslations } from '../alert-missing-phone-number/types';

export const translations: Record<LanguageCode, NotifycalTranslations> = {
  en: {
    appName: 'Notifycal',
    rightsReserved: 'All rights reserved'
  },
  es: {
    appName: 'Notifycal',
    rightsReserved: 'Todos los derechos reservados'
  }
};
