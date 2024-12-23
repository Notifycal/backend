import { Jwt as StructuredJwt } from 'jsonwebtoken';

export type Jwt = string;
export type Email = string;
export type JwtClaimChecker = (jwt: StructuredJwt) => boolean;
