import { EmailTemplate } from '@model/Email';
import type { LanguageCode } from '@notifycal/shared/types';
import { lowCreditsDetectedPartialTemplate } from './low-credits-detected.html.hbs';

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
    subject: 'Alerta: Créditos bajos detectados',
    mainMessage:
      'Hemos detectado que sus créditos cerca de acabarse. Para evitar interrupciones en el servicio de recordatorios, le recomendamos que recargue su cuenta pronto.',
    tipTitle: 'Acción Recomendada',
    tipContent:
      'Recargue su cuenta ahora para asegurar que todos sus recordatorios programados se envíen sin interrupciones.',
    billingAction: 'Recargar Cuenta'
  },
  en: {
    subject: 'Alert: Low Credits Detected',
    mainMessage:
      "We've detected that your credits are running low. To avoid interruptions in your reminder service, we recommend topping up your account soon.",
    tipTitle: 'Recommended Action',
    tipContent:
      'Top up your account now to ensure all your scheduled reminders are sent without interruption.',
    billingAction: 'Top Up Account'
  },
  ca: {
    subject: 'Alerta: Crèdits baixos detectats',
    mainMessage:
      "Hem detectat que els vostres crèdits s'estan acabant. Per evitar interrupcions en el servei de recordatoris, us recomanem que recarregueu el vostre compte aviat.",
    tipTitle: 'Acció Recomanada',
    tipContent:
      "Recarregueu el vostre compte ara per assegurar que tots els vostres recordatoris programats s'enviïn sense interrupcions.",
    billingAction: 'Recarregar Compte'
  }
};

export const lowCreditsDetectedTemplate = new EmailTemplate<
  EmailTextVariables,
  EmailDynamicVariables
>(lowCreditsDetectedPartialTemplate, specificTranslations);
