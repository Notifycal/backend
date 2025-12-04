import { EmailTemplate } from '@model/Email';
import type { LanguageCode } from '@notifycal/shared/types';
import { insufficientCreditsPartialTemplate } from './insufficient-credits.html.hbs';

interface EmailTextVariables extends Record<string, string> {
  subject: string;
  mainMessage: string;
  tipTitle: string;
  tipContent: string;
  billingAction: string;
}

interface EmailDynamicVariables extends Record<string, string> {
  billingUrl: string;
}

const specificTranslations: Record<LanguageCode, EmailTextVariables> = {
  es: {
    subject: 'Urgente: Créditos insuficientes - Recordatorio no enviado',
    mainMessage:
      'Lamentablemente, no pudimos enviar uno o más recordatorios programados debido a créditos insuficientes en su cuenta. Para reanudar el servicio de recordatorios, es necesario recargar su cuenta.',
    tipTitle: 'Acción Requerida',
    tipContent:
      'Recargue su cuenta inmediatamente para reanudar el envío de recordatorios y asegurar que sus citas no se pierdan.',
    billingAction: 'Recargar Cuenta Ahora'
  },
  en: {
    subject: 'Urgent: Insufficient Credits - Reminder Not Sent',
    mainMessage:
      "Unfortunately, we couldn't send one or more scheduled reminders due to insufficient credits in your account. To resume reminder service, please top up your account.",
    tipTitle: 'Action Required',
    tipContent:
      'Top up your account immediately to resume sending reminders and ensure your appointments are not missed.',
    billingAction: 'Top Up Account Now'
  },
  ca: {
    subject: 'Urgent: Crèdits insuficients - Recordatori no enviat',
    mainMessage:
      'Lamentablement, no hem pogut enviar un o més recordatoris programats per crèdits insuficients al vostre compte. Per reprendre el servei de recordatoris, cal recarregar el vostre compte.',
    tipTitle: 'Acció Requerida',
    tipContent:
      "Recarregueu el vostre compte immediatament per reprendre l'enviament de recordatoris i assegurar que no es perdin les vostres cites.",
    billingAction: 'Recarregar Compte Ara'
  }
};

export const insufficientCreditsTemplate = new EmailTemplate<
  EmailTextVariables,
  EmailDynamicVariables
>(insufficientCreditsPartialTemplate, specificTranslations);
