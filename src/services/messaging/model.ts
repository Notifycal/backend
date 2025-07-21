import type { ActionableEventFoundEvent } from '@model/app-events/ActionableEventFoundEvent';
import type { DemoReminderToBeSentEvent } from '@model/app-events/DemoReminderToBeSentEvent';
import type {
  CreditDeductionError,
  CreditDeductionResult,
  CreditDeductionSuccess,
  DemoCounterIncrementError,
  DemoCounterIncrementResult,
  DemoCounterIncrementSuccess
} from '@model/Credits';
import type { count } from 'sms-length';

type EventDataBase<TEvent, TResult> = {
  event: TEvent;
  deductionResult: TResult;
  numberOfMessagesEstimate: ReturnType<typeof count>;
};

type ActionableEventData = EventDataBase<
  ActionableEventFoundEvent,
  CreditDeductionResult<'deduct'>
>;
type DemoReminderData = EventDataBase<DemoReminderToBeSentEvent, DemoCounterIncrementResult>;

export type EventWithDeduction = ActionableEventData | DemoReminderData;
export type EventWithSuccessfulDeduction =
  | EventDataBase<ActionableEventFoundEvent, CreditDeductionSuccess<'deduct'>>
  | EventDataBase<DemoReminderToBeSentEvent, DemoCounterIncrementSuccess>;
export type EventWithFailedDeduction =
  | EventDataBase<ActionableEventFoundEvent, CreditDeductionError>
  | EventDataBase<DemoReminderToBeSentEvent, DemoCounterIncrementError>;

export function isSuccessfulDeduction(
  eventWithDeduction: EventWithDeduction
): eventWithDeduction is EventWithSuccessfulDeduction {
  return eventWithDeduction.deductionResult.success;
}
