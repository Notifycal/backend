import type { APIGatewayProxyEventWithRequestContext } from '@model/lambda-events/ApiGatewayEvents';

// Foundation: lambdaConfig is a top-level property of the event
export type EventWithConfig<TConfig> = APIGatewayProxyEventWithRequestContext<TConfig>;
