import { IEnv, IOptionalVariable, ExtenderTypeOptional } from 'env-var';
import { Jwt as StructuredJwt } from 'jsonwebtoken';

export type Jwt = string;
export type Email = string;
export type ConfigReaderFn<TConfig> = () => TConfig;
export type JwtClaimCheckerFn = (jwt: StructuredJwt) => boolean;
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export type Environment = IEnv<IOptionalVariable<{}> & ExtenderTypeOptional<{}>, NodeJS.ProcessEnv>;
