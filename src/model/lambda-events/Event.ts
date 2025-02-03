import type { APIGatewayProxyEventWithRequestContext } from '@model/lambda-events/ApiGatewayEvents';
import type { ScheduledEventWithRequestContext } from '@model/lambda-events/EventBridgeEvents';

export type EventWithConfig<TConfig> =
  | APIGatewayProxyEventWithRequestContext<TConfig>
  | ScheduledEventWithRequestContext<TConfig>;
