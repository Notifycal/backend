import type { AccessToken } from '@model/Jwt';
import type { IEnv, IOptionalVariable, ExtenderTypeOptional } from 'env-var';

// This is useful to make the type typesafe, funnily enough.
// So that one cannot mistakenly pass in an Email instead of a UserId when both are of type string
export type Brand<T, B> = T & { __brand: B };

export type Jwt = Brand<string, 'Jwt'>;
export type Email = Brand<string, 'Email'>;
export type Uuid = Brand<string, 'Uuid'>;
export type UserId = Brand<string, 'UserId'> | Uuid;
export type IdpId = Brand<string, 'IdpId'>;
export type UnixTimestamp = Brand<number, 'UnixTimestamp'>;

export type ConfigReaderFn<TConfig> = () => TConfig;
export type JwtClaimCheckerFn = (jwt: AccessToken) => boolean;
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export type Environment = IEnv<IOptionalVariable<{}> & ExtenderTypeOptional<{}>, NodeJS.ProcessEnv>;
