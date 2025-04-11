import { EventBridgeSchema } from '@aws-lambda-powertools/parser/schemas';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function eventBridgeEventSchema() {
  return EventBridgeSchema;
}
