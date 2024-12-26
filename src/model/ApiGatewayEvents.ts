import { APIGatewayProxyEventV2WithRequestContext } from 'aws-lambda';
import { AccessToken } from './Jwt';

// ApiGateway V2 Proxy Events
export type EventWithConfig<TConfig> = APIGatewayProxyEventV2WithRequestContext<
  ConfigRequestContext<TConfig>
>;
export type AuthedEventWithConfig<TConfig> = APIGatewayProxyEventV2WithRequestContext<
  AuthedAndConfigRequestContext<TConfig>
>;

// Request Contexts
export interface ConfigRequestContext<TConfig> {
  config: TConfig;
}
export interface AuthedAndConfigRequestContext<TConfig> extends ConfigRequestContext<TConfig> {
  authorizer: AccessToken;
}
