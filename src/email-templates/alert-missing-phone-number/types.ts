export interface EmailTextVariables {
  subject: string;
  header: string;
  greeting: string;
  mainMessage: string;
  tipTitle: string;
  tipContent: string;
  visitNotifycalFaq: string;
  helpOffer: string;
  thankYou: string;
}

export interface EmailDynamicVariables {
  logoSrc: string;
  notifycalFaqUrl: string;
}

export interface NotifycalTranslations {
  appName: string;
  rightsReserved: string;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
}
