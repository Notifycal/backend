import type { CorsEndpointConfig, OptionalCorsEndpointConfig } from '@model/Config';

export function hasCorsConfig<TConfig extends OptionalCorsEndpointConfig>(
  config: TConfig
): config is TConfig & { corsConfig: CorsEndpointConfig['corsConfig'] } {
  return 'corsConfig' in config;
}
