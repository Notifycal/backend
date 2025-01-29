import type { AccessToken } from '@model/Jwt';
import type { ExtenderTypeOptional, IEnv, IOptionalVariable } from 'env-var';

export type ConfigReaderFn<TConfig> = () => TConfig;
export type JwtClaimCheckerFn = (jwt: AccessToken) => boolean;
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export type Environment = IEnv<IOptionalVariable<{}> & ExtenderTypeOptional<{}>, NodeJS.ProcessEnv>;
