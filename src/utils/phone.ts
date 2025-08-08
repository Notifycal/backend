import type { phoneE164Schema, receiverStandardSchema } from '@model/app-events/common';
import { phoneByCountry } from '@notifycal/shared/i18n';
import type { receiverSchema } from '@notifycal/shared/schemas';
import type { PhoneContact, ReceiverContact } from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';
import { isValidPhoneNumber } from 'libphonenumber-js';
import type { z } from 'zod';

export function phoneToCanonicalForm(phone: PhoneContact): z.infer<typeof phoneE164Schema> {
  return {
    type: phone.type,
    phoneNumber:
      `${phoneByCountry[phone.countryCode].phoneDetails.dialCode}${phone.phoneNumber.toString()}` as PhoneNumberE164,
    countryCode: phone.countryCode
  };
}

export function receiverToCanonicalForm(
  contact: z.infer<typeof receiverSchema>
): z.infer<typeof receiverStandardSchema> {
  return phoneToCanonicalForm(contact);
}

function phoneValidator(data: PhoneContact, context: z.RefinementCtx): void {
  if (!isValidPhoneNumber(data.phoneNumber, data.countryCode)) {
    context.addIssue({
      code: 'custom',
      message: 'Phone number is invalid'
    });
  }
  if (!['ES', 'EN'].includes(data.countryCode)) {
    context.addIssue({
      code: 'custom',
      message: 'The only dial codes allowed, for now, are from Spain and United Kingdom'
    });
  }
}

export function receiverValidator(): (arg: ReceiverContact, ctx: z.RefinementCtx) => void {
  return (data, context) => {
    phoneValidator(data, context);
  };
}
