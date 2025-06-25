import type { StripeEventType } from '../stripe-schemas';

export abstract class BaseHandler {
  protected constructor(protected readonly stripeEventType: StripeEventType) {}

  protected handleError(operation: string): (error: unknown) => Promise<never> {
    return (error: unknown) =>
      Promise.reject(
        new Error(
          `Error while handling ${operation} in ${this.stripeEventType} event handler. Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
          { cause: error }
        )
      );
  }
}
