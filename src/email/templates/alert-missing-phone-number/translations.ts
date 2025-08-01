import { EmailTemplate } from '@model/Email';
import type { LanguageCode } from '@notifycal/shared/types';
import { alertMissingPhoneNumberPartialTemplate } from './alert-missing-phone-number.html.hbs';

interface EmailTextVariables extends Record<string, string> {
  subject: string;
  mainMessage: string;
  tipTitle: string;
  tipContent: string;
  visitNotifycalFaq: string;
}

interface EmailDynamicVariables extends Record<string, string> {
  notifycalFaqUrl: string;
}

const specificTranslations: Record<LanguageCode, EmailTextVariables> = {
  es: {
    subject: 'Alerta: Recordatorio no enviado',
    mainMessage:
      'Hemos detectado que uno o más recordatorios programados no pudieron ser enviados porque faltaba la información de contacto en los eventos de calendario correspondientes.',
    tipTitle: 'Solución',
    tipContent:
      'Para garantizar que todos sus recordatorios lleguen a su destino, asegúrese de que cada evento en su calendario incluya un número de teléfono o correo electrónico de contacto del destinatario.',
    visitNotifycalFaq: 'Para más información, consulte nuestra',
    helpOffer:
      '¿Necesita ayuda o encontró algún problema? Visite nuestro formulario de feedback para obtener asistencia o reportar cualquier inconveniente.',
    thankYou: '¡Gracias por confiar en Notifycal!'
  },
  en: {
    subject: 'Alert: Reminder Not Delivered',
    mainMessage:
      "We've detected that one or more scheduled reminders could not be delivered because contact information was missing from the corresponding calendar events.",
    tipTitle: 'Solution',
    tipContent:
      'To ensure all your reminders reach their destination, please make sure each calendar event includes a phone number or email address for the recipient.',
    visitNotifycalFaq: 'For more details, check our',
    helpOffer:
      'Need assistance or found an issue? Visit our feedback form to get help or report any problems you encounter.',
    thankYou: 'Thank you for choosing Notifycal!'
  },
  ca: {
    subject: 'Alerta: Recordatori no enviat',
    mainMessage:
      "Hem detectat que un o més recordatoris programats no s'han pogut enviar perquè faltava la informació de contacte als esdeveniments de calendari corresponents.",
    tipTitle: 'Solució',
    tipContent:
      'Per garantir que tots els vostres recordatoris arribin al seu destí, assegureu-vos que cada esdeveniment del vostre calendari inclogui un número de telèfon o correu electrònic de contacte del destinatari.',
    visitNotifycalFaq: 'Per a més informació, consulteu les nostres',
    helpOffer:
      'Necessiteu ajuda o heu trobat algun problema? Visiteu el nostre formulari de comentaris per obtenir assistència o informar de qualsevol inconvenient.',
    thankYou: 'Gràcies per confiar en Notifycal!'
  }
};

export const alertMissingPhoneNumberTemplate = new EmailTemplate<
  EmailTextVariables,
  EmailDynamicVariables
>(alertMissingPhoneNumberPartialTemplate, specificTranslations);
