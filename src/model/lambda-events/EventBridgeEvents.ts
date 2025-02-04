import { EventBridgeSchema } from '@aws-lambda-powertools/parser/schemas';
import type { EventBridgeEvent } from 'aws-lambda';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function eventBridgeEventSchema<TLambdaConfig>() {
  return EventBridgeSchema.extend({
    lambdaConfig: z.custom<TLambdaConfig>()
  });
}

export interface ScheduledEventWithRequestContext<TLambdaConfig>
  extends EventBridgeEvent<'Scheduled event', string> {
  lambdaConfig: TLambdaConfig;
}
