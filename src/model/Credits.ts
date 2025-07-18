/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';
import type { InsufficientCreditsError } from './Errors';

const fromBalanceSchema = z.enum(['subscription', 'topup']);

const creditDeductionOperationDetailsSchema = z.discriminatedUnion('type', [
  z.object({
    fromBalance: fromBalanceSchema,
    type: z.literal('deduct'),
    quantity: z.coerce.number()
  }),
  z.object({
    fromBalance: fromBalanceSchema,
    type: z.literal('clear')
  })
]);

const creditAdditionOperationDetailsSchema = z.discriminatedUnion('type', [
  z.object({
    fromBalance: fromBalanceSchema,
    type: z.literal('add'),
    quantity: z.number()
  }),
  z.object({
    fromBalance: fromBalanceSchema,
    type: z.literal('restore'),
    quantity: z.number()
  }),
  z.object({
    fromBalance: fromBalanceSchema,
    type: z.literal('reset')
  })
]);

const creditDeductionOperationTypeSchema = z.enum(['deduct', 'clear']);
const creditAdditionOperationTypeSchema = z.enum(['add', 'restore', 'reset']);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const baseSuccessSchema = (_coerced: boolean = false) =>
  z.object({
    success: _coerced
      ? z.preprocess((val) => {
          const coerced = z.coerce.boolean().parse(val);
          if (coerced !== true) {
            throw new Error('Success must be true');
          }
          return coerced;
        }, z.literal(true))
      : z.literal(true),
    result: z.string()
  });

const baseErrorSchema = z.object({
  success: z.literal(false),
  result: z.string(),
  error: z.unknown()
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const creditBalancesSchema = (coerced: boolean = false) => z.object({
  subscription: z.number({ coerce: coerced }),
  topup: z.number({ coerce: coerced })
});

const creditDeductionSuccessSchema = baseSuccessSchema().extend({
  operationDetails: creditDeductionOperationDetailsSchema,
  balances: creditBalancesSchema()
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
const creditDeductionDeductSuccessSchema = (coerced: boolean = false) =>
  baseSuccessSchema(coerced).extend({
    operationDetails: z.object({
      fromBalance: fromBalanceSchema,
      type: z.literal('deduct'),
      quantity: z.number({ coerce: coerced })
    }),
    balances: creditBalancesSchema(coerced)
  });

const creditDeductionInsufficientCreditsErrorSchema = baseErrorSchema.extend({
  result: z.literal('InsufficientCredits'),
  error: z.custom<InsufficientCreditsError>()
});

const creditDeductionBadRequestErrorSchema = baseErrorSchema.extend({
  result: z.literal('BadRequestError')
});

const creditDeductionUnexpectedErrorSchema = baseErrorSchema.extend({
  result: z.literal('UnknownError')
});

const creditDeductionErrorSchema = z.union([
  creditDeductionInsufficientCreditsErrorSchema,
  creditDeductionBadRequestErrorSchema,
  creditDeductionUnexpectedErrorSchema
]);

const creditDeductionResultSchema = z.union([
  creditDeductionSuccessSchema,
  creditDeductionErrorSchema
]);

const creditDeductionDeductResultSchema = z.union([
  creditDeductionDeductSuccessSchema(),
  creditDeductionErrorSchema
]);

const creditAdditionSuccessSchema = baseSuccessSchema().extend({
  operationDetails: creditAdditionOperationDetailsSchema,
  balances: creditBalancesSchema()
});

const creditAdditionBadRequestErrorSchema = baseErrorSchema.extend({
  result: z.literal('BadRequestError')
});

const creditAdditionUnexpectedErrorSchema = baseErrorSchema.extend({
  result: z.literal('UnknownError')
});

const creditAdditionResultSchema = z.union([
  creditAdditionSuccessSchema,
  creditAdditionBadRequestErrorSchema,
  creditAdditionUnexpectedErrorSchema
]);

const creditAdditionRestoreSuccessSchema = baseSuccessSchema().extend({
  operationDetails: z.object({
    fromBalance: fromBalanceSchema,
    type: z.literal('restore'),
    quantity: z.number()
  }),
  balances: creditBalancesSchema()
});

const creditAdditionRestoreResultSchema = z.union([
  creditAdditionRestoreSuccessSchema,
  creditAdditionBadRequestErrorSchema,
  creditAdditionUnexpectedErrorSchema
]);

const creditAdjustmentResultSchema = z.union([
  creditAdditionRestoreResultSchema,
  creditDeductionDeductResultSchema
]);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
const demoCounterIncrementSuccessSchema = (coerced: boolean = false) =>
  baseSuccessSchema(coerced).extend({
    demoRemindersCount: z.number({ coerce: coerced })
  });

const demoCounterLimitReachedErrorSchema = baseErrorSchema.extend({
  result: z.literal('DemoCounterLimitReachedError')
});

const demoCounterIncrementUnexpectedErrorSchema = baseErrorSchema.extend({
  result: z.literal('UnknownError')
});

const demoCounterIncrementErrorSchema = z.union([
  demoCounterLimitReachedErrorSchema,
  demoCounterIncrementUnexpectedErrorSchema
]);

const demoCounterIncrementResultSchema = z.union([
  demoCounterIncrementSuccessSchema(),
  demoCounterIncrementErrorSchema
]);

const demoCounterDecrementSuccessSchema = baseSuccessSchema().extend({
  demoRemindersCount: z.number()
});

const demoCounterDecrementUnexpectedErrorSchema = baseErrorSchema.extend({
  result: z.literal('UnknownError')
});

const demoCounterDecrementResultSchema = z.union([
  demoCounterDecrementSuccessSchema,
  demoCounterDecrementUnexpectedErrorSchema
]);

const creditAllowanceOperationResultSchema = z.union([
  creditDeductionResultSchema,
  demoCounterIncrementResultSchema
]);

const creditAllowanceOperationSuccessSchema = z.union([
  creditDeductionSuccessSchema,
  demoCounterIncrementSuccessSchema()
]);

export type CreditDeductionOperationDetails = z.infer<typeof creditDeductionOperationDetailsSchema>;
export type CreditAdditionOperationDetails = z.infer<typeof creditAdditionOperationDetailsSchema>;
export type CreditDeductionOperationType = z.infer<typeof creditDeductionOperationTypeSchema>;
export type CreditAdditionOperationType = z.infer<typeof creditAdditionOperationTypeSchema>;
const defaultCreditBalanceSchema = creditBalancesSchema();
export type CreditBalances = z.infer<typeof defaultCreditBalanceSchema>;

export interface CreditDeductionSuccess<TOperationType extends CreditDeductionOperationType>
  extends z.infer<typeof creditDeductionSuccessSchema> {
  readonly operationDetails: Extract<CreditDeductionOperationDetails, { type: TOperationType }>;
}

export type CreditDeductionInsufficientCreditsError = z.infer<
  typeof creditDeductionInsufficientCreditsErrorSchema
>;
export type CreditDeductionBadRequestError = z.infer<typeof creditDeductionBadRequestErrorSchema>;
export type CreditDeductionUnexpectedError = z.infer<typeof creditDeductionUnexpectedErrorSchema>;
export type CreditDeductionError = z.infer<typeof creditDeductionErrorSchema>;

export type CreditDeductionResult<TOperationType extends CreditDeductionOperationType> =
  | CreditDeductionSuccess<TOperationType>
  | CreditDeductionError;

export interface CreditAdditionSuccess<TOperationType extends CreditAdditionOperationType>
  extends z.infer<typeof creditAdditionSuccessSchema> {
  readonly operationDetails: Extract<CreditAdditionOperationDetails, { type: TOperationType }>;
}

export type CreditAdditionBadRequestError = z.infer<typeof creditAdditionBadRequestErrorSchema>;
export type CreditAdditionUnexpectedError = z.infer<typeof creditAdditionUnexpectedErrorSchema>;

export type CreditAdditionResult<TOperationType extends CreditAdditionOperationType> =
  | CreditAdditionSuccess<TOperationType>
  | CreditAdditionBadRequestError
  | CreditAdditionUnexpectedError;

const defaultDemoCounterIncrementSuccessSchema = demoCounterIncrementSuccessSchema();
export type DemoCounterIncrementSuccess = z.infer<typeof defaultDemoCounterIncrementSuccessSchema>;
export type DemoCounterLimitReachedError = z.infer<typeof demoCounterLimitReachedErrorSchema>;
export type DemoCounterIncrementUnexpectedError = z.infer<
  typeof demoCounterIncrementUnexpectedErrorSchema
>;
export type DemoCounterIncrementError = z.infer<typeof demoCounterIncrementErrorSchema>;
export type DemoCounterIncrementResult = z.infer<typeof demoCounterIncrementResultSchema>;

export type DemoCounterDecrementSuccess = z.infer<typeof demoCounterDecrementSuccessSchema>;
export type DemoCounterDecrementUnexpectedError = z.infer<
  typeof demoCounterDecrementUnexpectedErrorSchema
>;
export type DemoCounterDecrementResult = z.infer<typeof demoCounterDecrementResultSchema>;

export type CreditAllowanceOperationResult = z.infer<typeof creditAllowanceOperationResultSchema>;
export type CreditAllowanceOperationSuccess = z.infer<typeof creditAllowanceOperationSuccessSchema>;

export {
  creditAdditionRestoreResultSchema,
  creditAdditionRestoreSuccessSchema,
  creditAdditionResultSchema,
  creditAdjustmentResultSchema,
  creditDeductionDeductResultSchema,
  creditDeductionDeductSuccessSchema,
  creditDeductionResultSchema,
  demoCounterDecrementResultSchema,
  demoCounterDecrementSuccessSchema,
  demoCounterIncrementResultSchema,
  demoCounterIncrementSuccessSchema
};
