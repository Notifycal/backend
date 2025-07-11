import type { OurAccessTokenClaims } from '@model/Jwt';
import type { Email, Identity, IdpId, IdpName, UserId } from '@notifycal/shared/types';

const validUserId = 'cfaa8471-f4cc-44da-bc22-ddc4b735a847' as UserId;
const validEmail = 'test@notifycal.com' as Email;

export function _validIdentity(
  userId: UserId = validUserId,
  email: Email = validEmail
): Identity<IdpName> {
  return {
    userId: userId,
    email: email,
    idp: 'google.com' as const,
    idpId: '3625462456246' as IdpId
  } as const;
}

export function _validAccessTokenPayload(
  userId: UserId = validUserId,
  email: Email = validEmail
): OurAccessTokenClaims {
  return {
    ..._validIdentity(userId, email),
    role: 'user' as const,
    permissions: {}
  } as const;
}

export const validIdentity = _validIdentity();
export const validAccessTokenPayload = _validAccessTokenPayload();
