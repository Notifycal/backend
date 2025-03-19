import type { AccessToken } from '@model/Jwt';
import type { Brand } from '@notifycal/shared/types';
import type { ExtenderTypeOptional, IEnv, IOptionalVariable } from 'env-var';

export type ConfigReaderFn<TConfig> = () => TConfig;
export type JwtClaimCheckerFn = (jwt: AccessToken) => boolean;
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export type Environment = IEnv<IOptionalVariable<{}> & ExtenderTypeOptional<{}>, NodeJS.ProcessEnv>;

export type AwsArn = Brand<string, 'AwsArn'>;
export type Url = Brand<string, 'Url'>;

// eslint-disable-next-line no-use-before-define
export type Json = string | number | boolean | null | Array<Json> | JsonObject;
export type JsonObject = { [key: string]: Json };

export type PhoneNumberE164 = Brand<string, 'PhoneNumberE164'>;
