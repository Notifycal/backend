import type {
  MessageReceiver,
  MessageSender,
  senderStandardSchema
} from '@model/app-events/common';
import { phoneByCountry } from '@notifycal/shared/i18n';
import type { senderSchema } from '@notifycal/shared/schemas';
import type { PhoneNumberE164 } from '@own-types/model';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { match, P } from 'ts-pattern';
import { z } from 'zod';

export function toCanonicalForm(
  senderContact: z.infer<typeof senderSchema>
): z.infer<typeof senderStandardSchema> {
  return match(senderContact)
    .with({ type: 'rcs', identifier: P.string }, (rcsPhone) => rcsPhone)
    .with({ type: 'phone', countryCode: P.any, phoneNumber: P.string }, (phone) => ({
      type: phone.type,
      phoneNumber:
        `${phoneByCountry[phone.countryCode].phoneDetails.dialCode}${phone.phoneNumber.toString()}` as PhoneNumberE164,
      countryCode: phone.countryCode
    }))
    .exhaustive();
}

function phoneValidator(
  data: {
    type: 'phone';
    phoneNumber: string & z.BRAND<'PhoneNumberE164'>;
    countryCode: 'ES' | 'GB';
  },
  context: z.RefinementCtx
): void {
  if (!isValidPhoneNumber(data.phoneNumber, data.countryCode)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Phone number is invalid'
    });
  }
  if (!['ES', 'EN'].includes(data.countryCode)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'The only dial codes allowed, for now, are from Spain and United Kingdom'
    });
  }
}

export function senderValidator(): (arg: MessageSender, ctx: z.RefinementCtx) => void {
  return (data, context) => {
    match(data)
      .with({ type: 'rcs' }, () => {})
      .with({ type: 'phone', countryCode: P.any, phoneNumber: P.string }, (phone) => {
        phoneValidator(phone, context);
      })
      .exhaustive();
  };
}

export function receiverValidator(): (arg: MessageReceiver, ctx: z.RefinementCtx) => void {
  return (data, context) => {
    phoneValidator(data, context);
  };
}
