import type { JSONValue } from '@aws-lambda-powertools/commons/types';
import { IdempotencyConfig, makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import type { DynamoDBPersistenceOptions } from '@aws-lambda-powertools/idempotency/dynamodb/types';
import type {
  IdempotencyConfigOptions,
  ItempotentFunctionOptions
} from '@aws-lambda-powertools/idempotency/types';
import { throwError } from '@services/common/error-handling';
import { tap } from '@utils/promises';
import type { Context } from 'aws-lambda';

type AnyFunction<TArgs extends Array<unknown>, TReturn> = (...args: TArgs) => Promise<TReturn>;

export abstract class AbstractIdempotentProcessor<TSuccessResponse> {
  protected constructor(
    protected readonly persistanceConfig: DynamoDBPersistenceOptions,
    protected readonly context: Context
  ) {}

  protected processIdempotently<TArgs extends Array<unknown>>(
    processorFn: AnyFunction<TArgs, TSuccessResponse>,
    args: TArgs,
    onIdempotencyHit: (response: TSuccessResponse) => Promise<void>,
    onError: (error?: unknown) => Promise<void>,
    idempotencyOptions: IdempotencyConfigOptions,
    idempotencyFunctionOptions: {
      dataIndexArgument: number;
    }
  ): Promise<TSuccessResponse> {
    let isIdempotencyHit = false;
    const responseHookFn = (response: JSONValue): JSONValue => {
      isIdempotencyHit = true;
      return response;
    };
    const idempotencyConfig = this.configureIdempotency(
      responseHookFn,
      idempotencyOptions,
      idempotencyFunctionOptions
    );

    const idempotentProcessorFn = makeIdempotent(processorFn, idempotencyConfig);
    return idempotentProcessorFn(...args).then(
      tap(async (response: TSuccessResponse) => {
        if (isIdempotencyHit) {
          await onIdempotencyHit(response);
        }
      }),
      async (err) => {
        await onError(err);
        throwError('Error while processing idempotently', err);
      }
    );
  }

  private configureIdempotency<TArgs extends Array<unknown>>(
    responseHookFn: (response: JSONValue) => JSONValue,
    idempotencyOptions: IdempotencyConfigOptions,
    idempotencyFunctionOptions: {
      dataIndexArgument: number;
    }
  ): ItempotentFunctionOptions<TArgs> {
    const idempotencyConfig = new IdempotencyConfig({
      throwOnNoIdempotencyKey: true,
      responseHook: responseHookFn,
      ...idempotencyOptions
    });
    idempotencyConfig.registerLambdaContext(this.context);

    const idempotencyPersistence = new DynamoDBPersistenceLayer(this.persistanceConfig);
    return {
      persistenceStore: idempotencyPersistence,
      config: idempotencyConfig,
      ...idempotencyFunctionOptions
    };
  }
}
