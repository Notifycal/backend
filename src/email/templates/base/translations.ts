import type { LanguageCode } from '@notifycal/shared/types';

export interface EmailCommonTranslations extends Record<string, string> {
  appName: string;
  helpOffer: string;
  thankYou: string;
  rightsReserved: string;
}

export const commonTranslations: Record<LanguageCode, EmailCommonTranslations> = {
  en: {
    appName: 'Notifycal',
    helpOffer:
      'Need assistance or found an issue? Visit our feedback form to get help or report any problems you encounter.',
    thankYou: 'Thank you for choosing Notifycal!',
    rightsReserved: 'All rights reserved'
  },
  es: {
    appName: 'Notifycal',
    helpOffer:
      '¿Necesita ayuda o encontró algún problema? Visite nuestro formulario de feedback para obtener asistencia o reportar cualquier inconveniente.',
    thankYou: '¡Gracias por confiar en Notifycal!',
    rightsReserved: 'Todos los derechos reservados'
  }
};
