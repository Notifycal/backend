import type { Logger } from '@aws-lambda-powertools/logger';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type { IdpName, UserId } from '@notifycal/shared/types';
import { rejectWithMessage, rejectWithMessageAndError } from '@services/common/error-handling';
import { BaseStore, type BaseStoreConfig } from '../common/base-store';

export class UserDemoReminderService<TIdpName extends IdpName> extends BaseStore<BaseStoreConfig> {
  public constructor(config: BaseStoreConfig, logger: Logger) {
    super(config, logger);
  }

  public incrementDemoReminderCount(
    userId: UserId,
    demoReminderLimit: number
  ): Promise<{ DemoReminderCount: number }> {
    return this.updateDemoReminderCount(
      userId,
      {
        UpdateExpression:
          'SET DemoReminderCount = if_not_exists(DemoReminderCount, :zero) + :increment',
        ConditionExpression:
          'attribute_not_exists(DemoReminderCount) OR DemoReminderCount < :limit',
        ExpressionAttributeValues: {
          ':increment': 1,
          ':limit': demoReminderLimit,
          ':zero': 0
        }
      },
      'increment',
      'Demo reminder limit reached'
    );
  }

  public decrementDemoReminderCount(userId: UserId): Promise<{ DemoReminderCount: number }> {
    return this.updateDemoReminderCount(
      userId,
      {
        UpdateExpression: 'SET DemoReminderCount = DemoReminderCount - :decrement',
        ConditionExpression: 'attribute_exists(DemoReminderCount) AND DemoReminderCount > :zero',
        ExpressionAttributeValues: {
          ':decrement': 1,
          ':zero': 0
        }
      },
      'decrement',
      'Cannot decrement demo reminder count: count is already at zero or does not exist'
    );
  }

  private updateDemoReminderCount(
    userId: UserId,
    updateParams: {
      UpdateExpression: string;
      ConditionExpression: string;
      ExpressionAttributeValues: Record<string, unknown>;
    },
    operation: 'increment' | 'decrement',
    errorMessageOnConditionalCheckFailedError: string
  ): Promise<{ DemoReminderCount: number }> {
    return this.updateCommandRunner({
      Key: { UserId: userId },
      ...updateParams
    }).then(
      (output) => {
        const updatedUser = output.Attributes as UserStoreRecord<TIdpName> | undefined;
        if (updatedUser && updatedUser.DemoReminderCount !== undefined) {
          return { DemoReminderCount: updatedUser.DemoReminderCount };
        } else {
          return rejectWithMessage(`Unexpected error while ${operation}ing demo reminder count`);
        }
      },
      (error) => {
        if (this.isConditionalCheckFailedError(error)) {
          return rejectWithMessageAndError(errorMessageOnConditionalCheckFailedError, error);
        }
        return rejectWithMessageAndError(
          `Failed to decrement demo reminder count for user '${userId}'`,
          error
        );
      }
    );
  }
}
