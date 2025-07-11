/* eslint-disable vitest/max-expects */
/* eslint-disable camelcase */
import type { Logger } from '@aws-lambda-powertools/logger';
import type { Email, IdpId, IdpName, UserId, UserIdentity } from '@notifycal/shared/types';
import type { Stripe } from 'stripe';
import { v4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import type { EventHandler, EventHandlerBuilder } from './event-handlers/common';
import type { EventPublisher } from './event-publisher';
import type { IdentityExtractor } from './identity-extractor';
import { StripeEventProcessor } from './stripe-event-processor';
import type { StripeEventType } from './stripe-schemas';

describe(StripeEventProcessor, () => {
  const validIdentity: UserIdentity<IdpName> = {
    userId: v4() as UserId,
    idp: 'google.com',
    idpId: 'google-id-123' as IdpId,
    email: 'test@notifycal.es' as Email
  };

  const validEvent: Stripe.Event = {
    id: 'evt_123',
    object: 'event',
    api_version: '2023-10-16',
    created: 1234567890,
    data: {
      object: {},
      previous_attributes: {}
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type: 'customer.created'
  } as Stripe.Event;

  const invalidEvent: Stripe.Event = {
    ...validEvent,
    type: 'unknown.event.type' as StripeEventType
  } as Stripe.Event;

  const extractFn = vi.fn();
  const handleFn = vi.fn();
  const publishFn = vi.fn();
  const onUnhandledEventFn = vi.fn();
  const appendKeysFn = vi.fn();
  const infoFn = vi.fn();
  const errorFn = vi.fn();

  describe('process method', () => {
    it('should successfully process a handled event type', async () => {
      await testIt(validEvent);

      expect(extractFn).toHaveBeenCalledTimes(1);
      expect(extractFn).toHaveBeenCalledWith(validEvent);

      expect(appendKeysFn).toHaveBeenCalledTimes(2);
      expect(appendKeysFn).toHaveBeenCalledWith({
        eventType: 'customer.created'
      });
      expect(appendKeysFn).toHaveBeenCalledWith({
        ...validIdentity
      });

      expect(handleFn).toHaveBeenCalledTimes(1);
      expect(handleFn).toHaveBeenCalledWith(validEvent, validIdentity);

      expect(infoFn).toHaveBeenCalledTimes(1);
      expect(infoFn).toHaveBeenCalledWith('Successfully processed event');

      expect(publishFn).toHaveBeenCalledTimes(1);
      expect(publishFn).toHaveBeenCalledWith(validEvent, validIdentity);

      expect(onUnhandledEventFn).not.toHaveBeenCalled();
      expect(errorFn).not.toHaveBeenCalled();
    });

    it('should call onUnhandledEvent for unknown event types', async () => {
      await testIt(invalidEvent, undefined, undefined, undefined, undefined, new Map());

      expect(errorFn).toHaveBeenCalledTimes(1);
      expect(errorFn).toHaveBeenCalledWith(
        'Unhandled event type. This means the integration on Stripe side is configured to send event types for which there is no event handlers in code'
      );

      expect(onUnhandledEventFn).toHaveBeenCalledTimes(1);
      expect(onUnhandledEventFn).toHaveBeenCalledWith(invalidEvent);

      expect(extractFn).not.toHaveBeenCalled();
      expect(handleFn).not.toHaveBeenCalled();
      expect(publishFn).not.toHaveBeenCalled();
    });

    it('should throw error when identity extraction fails', async () => {
      const extractionError = new Error('Failed to extract identity');

      const result = testIt(validEvent, () => Promise.reject(extractionError));

      await expect(result).rejects.toThrow('Error processing event');

      expect(handleFn).not.toHaveBeenCalled();
      expect(publishFn).not.toHaveBeenCalled();
    });

    it('should throw error when event handler fails', async () => {
      const handlerError = new Error('Handler failed');

      const result = testIt(validEvent, undefined, () => Promise.reject(handlerError));

      await expect(result).rejects.toThrow('Error processing event');

      expect(extractFn).toHaveBeenCalledTimes(1);
      expect(appendKeysFn).toHaveBeenCalledTimes(2);
      expect(publishFn).not.toHaveBeenCalled();
    });

    it('should not throw error when event publisher fails', async () => {
      const publisherError = new Error('Publisher failed');

      const result = testIt(validEvent, undefined, undefined, () => Promise.reject(publisherError));

      await expect(result).resolves.toBeUndefined();
      expect(extractFn).toHaveBeenCalledTimes(1);
      expect(handleFn).toHaveBeenCalledTimes(1);
      expect(infoFn).toHaveBeenCalledTimes(1);
      expect(errorFn).toHaveBeenCalledWith(
        'There was an error publishing an Stripe event after having processed it',
        {
          cause: publisherError,
          event: validEvent
        }
      );
    });

    function testIt(
      event: Stripe.Event,
      extractFnImpl = () => Promise.resolve(validIdentity),
      handleFnImpl = () => Promise.resolve(),
      publishFnImpl = () => Promise.resolve(),
      onUnhandledEventFnImpl = () => Promise.resolve(),
      eventHandlers?: Map<StripeEventType, EventHandlerBuilder<Stripe.Event>>
    ): Promise<void> {
      extractFn.mockReset().mockImplementation(extractFnImpl);
      handleFn.mockReset().mockImplementation(handleFnImpl);
      publishFn.mockReset().mockImplementation(publishFnImpl);
      onUnhandledEventFn.mockReset().mockImplementation(onUnhandledEventFnImpl);
      appendKeysFn.mockReset();
      infoFn.mockReset();
      errorFn.mockReset();

      const identityExtractorMock = {
        extract: extractFn
      } as unknown as IdentityExtractor<Stripe.Event>;

      const eventHandlerMock = {
        handle: handleFn
      } as unknown as EventHandler<Stripe.Event>;

      const eventPublisherMock = {
        publish: publishFn
      } as unknown as EventPublisher<Stripe.Event>;

      const loggerMock = {
        appendKeys: appendKeysFn,
        info: infoFn,
        error: errorFn
      } as unknown as Logger;

      const handlers =
        eventHandlers || new Map([['customer.created' as StripeEventType, () => eventHandlerMock]]);

      const processor = new StripeEventProcessor(
        identityExtractorMock,
        handlers,
        eventPublisherMock,
        loggerMock,
        onUnhandledEventFn
      );

      return processor.process(event);
    }
  });
});
