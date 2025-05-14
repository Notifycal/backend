import { accessTokenSchema, type OurAccessTokenClaims } from '@model/Jwt';
import type { LiveUserStoreRecord } from '@model/store/LiveUserStoreRecord';
import type { UserStoreRecord } from '@model/store/UserStoreRecord';
import type {
  BusinessAddress,
  BusinessName,
  CalendarId,
  CalendarName,
  DateTime,
  Email,
  IdpId,
  IdpName,
  PhoneNumber,
  TemplateId,
  TimeZone,
  UserId
} from '@notifycal/shared/types';
import type { AwsArn, PhoneNumberE164 } from '@own-types/model';
import { SnsService } from '@services/sns';
import { UserBaseStore } from '@services/stores/user-base-store';
import { testAuthedEvent, testEvent } from '@testing/data/apigateway';
import {
  setEnvBaseConfig,
  setEnvDecodeAccessJwtConfig,
  setEnvDemoReminderToBeSentTopicConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { getDefaultDecodeAccessJwtConfig } from '@testing/utils/jwt';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import type { PostDemoReminderConfig } from './config';
// @ts-expect-error cjs handler export
import { handler, type Event } from './index';

vi.mock('@services/sns');
vi.mock('@services/stores/user-base-store');

const validDateTime = '2023-10-01T12:00:00Z' as DateTime;
const validTimeZone = 'Europe/Madrid' as TimeZone;
const validIdentity = {
  userId: 'cfaa8471-f4cc-44da-bc22-ddc4b735a847' as UserId,
  email: 'test@notifycal.com' as Email,
  idp: 'google.com' as IdpName,
  idpId: '246534735745767767' as IdpId
};
const validAccessToken: OurAccessTokenClaims = {
  ...validIdentity,
  role: 'user',
  permissions: {}
};

const validUserConfig: LiveUserStoreRecord<unknown>['Config'] = {
  Calendars: [
    {
      Id: 'calendar-id-1' as CalendarId,
      Name: 'Test Calendar' as CalendarName,
      Template: {
        Id: 'informal-en-01' as TemplateId,
        Language: 'en'
      }
    }
  ],
  Business: {
    SenderContact: {
      Type: 'phone',
      PhoneNumber: '666999888' as PhoneNumber,
      CountryCode: 'ES'
    },
    Name: 'Test Business' as BusinessName,
    Address: 'Test Address' as BusinessAddress,
    Language: 'en',
    TimeZone: 'Europe/London' as TimeZone,
    CompanyIndustry: {
      Category: 'category',
      Subcategory: 'subcategory',
      CustomIndustry: 'custom'
    },
    CompanySize: 'freelancer'
  },
  Confirmation: {
    TermsAccepted: '2023-01-01T00:00:00Z' as DateTime,
    PrivacyAccepted: '2023-01-01T00:00:00Z' as DateTime,
    MarketingOptInAccepted: '2023-01-01T00:00:00Z' as DateTime
  }
};

const validRequestBody: Event['body'] = {
  startTime: {
    dateTime: validDateTime,
    timeZone: validTimeZone
  }
};

describe('Post Demo Reminder', () => {
  it('should successfully publish a demo reminder event', async () => {
    const validEvent = (await testAuthedEvent(
      validRequestBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserConfigByIdFn = vi.fn().mockResolvedValue(validUserConfig);
    const publishFn = vi.fn().mockResolvedValue({});

    const result = await testit(validEvent, getUserConfigByIdFn, publishFn);

    const senderAndReceiver = {
      type: 'phone' as const,
      countryCode: 'ES',
      phoneNumber: `+34666999888` as PhoneNumberE164
    };

    expect(result.statusCode).toBe(202);
    expect(getUserConfigByIdFn).toHaveBeenCalledWith(validAccessToken.userId);
    expect(publishFn).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'DemoReminderToBeSent',
        userId: validIdentity.userId,
        data: {
          receiverDetails: senderAndReceiver,
          senderDetails: senderAndReceiver,
          message:
            "Don't forget your appointment at Test Business! On 01/10/2023 at 14:00 at Test Address. If you can't make it, let us know."
        }
      })
    );
  });

  it('should return 400 if payload is invalid', async () => {
    const invalidBody = {
      receiverContact: 4567457634624,
      startTime: {
        dateTime: validDateTime
      }
    };
    const validEvent = (await testAuthedEvent(
      invalidBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserConfigByIdFn = vi.fn();
    const publishFn = vi.fn();

    const result = await testit(validEvent, getUserConfigByIdFn, publishFn);

    expect(result.statusCode).toBe(400);
    expect(getUserConfigByIdFn).not.toHaveBeenCalled();
    expect(publishFn).not.toHaveBeenCalled();
  });

  it('should return 401 if missing authorization', async () => {
    const validEvent = testEvent(validRequestBody) as APIGatewayProxyEvent;
    const getUserConfigByIdFn = vi.fn();
    const publishFn = vi.fn();

    const result = await testit(validEvent, getUserConfigByIdFn, publishFn);

    expect(result.statusCode).toBe(401);
    expect(getUserConfigByIdFn).not.toHaveBeenCalled();
    expect(publishFn).not.toHaveBeenCalled();
  });

  it('should return 500 when user config is not found', async () => {
    const validEvent = (await testAuthedEvent(
      validRequestBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserConfigByIdFn = vi.fn(() => Promise.resolve(undefined));
    const publishFn = vi.fn();

    const result = await testit(validEvent, getUserConfigByIdFn, publishFn);

    expect(result.statusCode).toBe(500);
    expect(getUserConfigByIdFn).toHaveBeenCalledWith(validAccessToken.userId);
    expect(publishFn).not.toHaveBeenCalled();
  });

  it('should return 500 when user config Promise is rejected', async () => {
    const validEvent = (await testAuthedEvent(
      validRequestBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const getUserConfigByIdFn = vi.fn().mockRejectedValue(new Error('Database error'));
    const publishFn = vi.fn().mockResolvedValue({});

    const result = await testit(validEvent, getUserConfigByIdFn, publishFn);

    expect(result.statusCode).toBe(500);
    expect(getUserConfigByIdFn).toHaveBeenCalledWith(validAccessToken.userId);
    expect(publishFn).not.toHaveBeenCalled();
  });

  it('should return 500 when SNS service fails to publish', async () => {
    const validEvent = (await testAuthedEvent(
      validRequestBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const error = new Error('Failed to publish message');
    const publishFn = vi.fn().mockRejectedValue(error);
    const getUserConfigByIdFn = vi.fn().mockResolvedValue(validUserConfig);

    const result = await testit(validEvent, getUserConfigByIdFn, publishFn);

    expect(result.statusCode).toBe(500);
    expect(getUserConfigByIdFn).toHaveBeenCalledWith(validAccessToken.userId);
    expect(publishFn).toHaveBeenCalledOnce();
  });
});

const defaultEnv = {
  decodeAccessJwtConfig: getDefaultDecodeAccessJwtConfig(),
  userBaseStoreConfig: {
    tableName: 'Some-table-name'
  },
  demoReminderToBeSentTopicConfig: {
    topicArn: 'arn:aws:sns:eu-west-1:123456789012:DemoReminderToBeSent' as AwsArn
  },
  corsConfig: {
    frontendDomain: 'http://localhost:5173'
  }
};

function testit(
  event: APIGatewayProxyEvent,
  getUserConfigByIdFn: () => Promise<UserStoreRecord<unknown>['Config'] | undefined>,
  publishFn: () => Promise<void>,
  config: PostDemoReminderConfig = defaultEnv
): Promise<APIGatewayProxyResult> {
  const userBaseStoreMock = {
    getUserConfigById: vi.fn().mockImplementation(getUserConfigByIdFn)
  };
  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(UserBaseStore.withConfig).mockReturnValue(
    userBaseStoreMock as unknown as UserBaseStore<IdpName>
  );
  const snsServiceMock = {
    publish: publishFn
  };
  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(SnsService.withConfig).mockReturnValue(snsServiceMock as unknown as SnsService);
  setEnv(config);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return handler(event as unknown as Event, {} as Context);
}

function setEnv(config: PostDemoReminderConfig): void {
  setEnvDecodeAccessJwtConfig(config.decodeAccessJwtConfig);
  setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
  setEnvDemoReminderToBeSentTopicConfig(config.demoReminderToBeSentTopicConfig);
  setEnvBaseConfig(config.corsConfig);
}
