import type { gaxios } from 'google-auth-library';

// just acting as a proxy to avoid having to do `gaxios.<Type>`.
export type Gaxios = gaxios.Gaxios;
export type GaxiosOptions = gaxios.GaxiosOptions;
export type GaxiosOptionsPrepared = gaxios.GaxiosOptionsPrepared;
export type GaxiosResponse<T> = gaxios.GaxiosResponse<T>;
export type GaxiosInterceptor<T extends GaxiosOptionsPrepared | GaxiosResponse<unknown>> =
  gaxios.GaxiosInterceptor<T>;
