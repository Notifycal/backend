import type { APIGatewayProxyEventWithRequestContext } from '@model/lambda-events/ApiGatewayEvents';
import type { ScheduledEventWithRequestContext } from '@model/lambda-events/EventBridgeEvents';

// Foundation: lambdaConfig is a top-level property of the event
export type EventWithConfig<TConfig> =
  | APIGatewayProxyEventWithRequestContext<TConfig>
  | ScheduledEventWithRequestContext<TConfig>;
