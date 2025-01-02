import type { APIGatewayProxyEventV2WithRequestContext } from 'aws-lambda';
import type { AccessToken } from './Jwt';

// Request Contexts
export interface ConfigRequestContext<TConfig> {
  config: TConfig;
}
export interface AuthedAndConfigRequestContext<TConfig> extends ConfigRequestContext<TConfig> {
  authorizer: AccessToken;
}

// ApiGateway V2 Proxy Events
export type EventWithConfig<TConfig> = APIGatewayProxyEventV2WithRequestContext<
  ConfigRequestContext<TConfig>
>;
export type AuthedEventWithConfig<TConfig> = APIGatewayProxyEventV2WithRequestContext<
  AuthedAndConfigRequestContext<TConfig>
>;
