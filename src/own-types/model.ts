import type { Brand, Jwt } from '@notifycal/shared/types';
import type { ExtenderTypeOptional, IEnv, IOptionalVariable } from 'env-var';
import type { z } from 'zod';

export type ConfigReaderFn<TConfig> = () => TConfig;
export type JwtDecoderAndSignatureVerifierFn<T extends z.ZodTypeAny, TJwtConfig> = (
  jwt: Jwt,
  schema: T,
  config: TJwtConfig
) => Promise<z.infer<T>>;
export type JwtClaimCheckerFn<TAccessToken, TConfig> = (
  jwt: TAccessToken,
  config: TConfig
) => boolean;
export type SigningSecret = Brand<string, 'SigningSecret'>;
export type PrivateKey = Brand<string, 'PrivateKey'>;
export type PublicKey = Brand<string, 'PublicKey'>;
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export type Environment = IEnv<IOptionalVariable<{}> & ExtenderTypeOptional<{}>, NodeJS.ProcessEnv>;

export type AwsArn = Brand<string, 'AwsArn'>;
export type Url = Brand<string, 'Url'>;

// eslint-disable-next-line no-use-before-define
export type Json = string | number | boolean | null | Array<Json> | JsonObject;
export type JsonObject = { [key: string]: Json };

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
