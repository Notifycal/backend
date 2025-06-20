import { accessTokenSchema, type OurAccessTokenClaims } from '@model/Jwt';
import {
  templateMap,
  type BusinessAddress,
  type BusinessName,
  type CalendarId,
  type CalendarName,
  type Email,
  type IdpId,
  type IdpName,
  type PhoneNumber,
  type ReminderConfigTransformed,
  type UserId
} from '@notifycal/shared/types';
import { UserBaseStore } from '@services/stores/user-base-store';
import { c, testAuthedEvent, testEvent } from '@testing/data/apigateway';
import { responseError, responseSuccess } from '@testing/utils/api-response-handlers';
import { assert } from '@testing/utils/assertions';
import {
  setEnvBaseConfig,
  setEnvDecodeAccessJwtConfig,
  setEnvUserBaseStoreConfig
} from '@testing/utils/config';
import { getDefaultDecodeAccessJwtConfig } from '@testing/utils/jwt';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';
import type { PatchUserProfileConfig } from './config';
// @ts-expect-error cjs handler export
import { handler, type Event, type bodySchema } from './index';

describe('PATCH User profile', () => {
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
  const validBody: z.input<typeof bodySchema> = {
    business: {
      name: 'someBusinessName' as BusinessName,
      address: 'someBusinessAddress' as BusinessAddress,
      senderContact: {
        type: 'phone',
        countryCode: 'ES',
        phoneNumber: '666888999' as PhoneNumber
      },
      language: 'en',
      companyIndustry: {
        category: 'category',
        subcategory: 'subcategory',
        customIndustry: 'custom'
      },
      companySize: 'freelancer'
    },
    confirmation: {
      termsAccepted: true,
      privacyAccepted: true,
      marketingOptInAccepted: false
    },
    calendars: [
      {
        id: 'aCalendarId' as CalendarId,
        name: 'aCalendarName' as CalendarName,
        template: {
          id: templateMap['formal-en-01'].id,
          language: templateMap['formal-en-01'].language
        }
      }
    ]
  };

  it('patch a user', async () => {
    const event = (await testAuthedEvent(
      validBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const updateUserFn = vi.fn().mockResolvedValue(null);

    return testit(event, updateUserFn).then((resp) => {
      assert(resp, responseSuccess(undefined, 204));

      expect(updateUserFn).toHaveBeenCalledWith(
        validAccessToken.userId,
        'demo',
        expect.objectContaining({
          Business: {
            Name: 'someBusinessName' as BusinessName,
            Address: 'someBusinessAddress' as BusinessAddress,
            SenderContact: {
              Type: 'phone',
              CountryCode: 'ES',
              PhoneNumber: '666888999' as PhoneNumber
            },
            Language: 'en',
            CompanyIndustry: {
              Category: 'category',
              Subcategory: 'subcategory',
              CustomIndustry: 'custom'
            },
            CompanySize: 'freelancer'
          },
          Confirmation: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            TermsAccepted: expect.any(String),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            PrivacyAccepted: expect.any(String),
            MarketingOptInAccepted: undefined
          },
          Calendars: [
            {
              Id: 'aCalendarId' as CalendarId,
              Name: 'aCalendarName' as CalendarName,
              Template: {
                Id: templateMap['formal-en-01'].id,
                Language: templateMap['formal-en-01'].language
              }
            }
          ]
        })
      );
    });
  });

  it('fail to patch a user with 400 if payload is invalid', async () => {
    const invalidBody = {
      business: {
        name: '' as BusinessName,
        address: '' as BusinessAddress,
        contactDetails: {
          type: 'something that invalidates the whole thing',
          identifier: '666777999' as PhoneNumber
        }
      },
      calendars: []
    } as unknown as ReminderConfigTransformed;
    const event = (await testAuthedEvent(
      invalidBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const updateUserFn = vi.fn();

    return testit(event, updateUserFn).then((resp) => {
      assert(resp, responseError(400));

      expect(updateUserFn).not.toHaveBeenCalled();
    });
  });

  it('fail to patch a user with 400 if phone number in payload is invalid', async () => {
    const invalidBody = {
      business: {
        name: 'Some business name',
        address: 'Some address',
        contactDetails: {
          type: 'phone',
          countryCode: 'ES',
          phoneNumber: '111222333' as PhoneNumber
        }
      },
      calendars: validBody.calendars
    };
    const event = (await testAuthedEvent(
      invalidBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const updateUserFn = vi.fn();

    return testit(event, updateUserFn).then((resp) => {
      assert(resp, responseError(400));

      expect(updateUserFn).not.toHaveBeenCalled();
    });
  });

  it('fail to return a user with 401 if no authorization present', async () => {
    const event = testEvent({}, {}) as unknown as APIGatewayProxyEvent;
    const updateUserFn = vi.fn();

    return testit(event, updateUserFn).then((resp) => {
      assert(resp, responseError(401));

      expect(updateUserFn).not.toHaveBeenCalled();
    });
  });

  it('fail if a user cannot be patched with 500', async () => {
    const event = (await testAuthedEvent(
      validBody,
      {},
      accessTokenSchema,
      validAccessToken
    )) as unknown as APIGatewayProxyEvent;
    const updateUserFn = vi.fn().mockRejectedValue(new Error('Boom!'));

    return testit(event, updateUserFn).then((resp) => {
      assert(resp, responseError(500));

      expect(updateUserFn).toHaveBeenCalledOnce();
    });
  });
});

// eslint-disable-next-line @typescript-eslint/require-await
async function testit(
  event: APIGatewayProxyEvent,
  updateUserFn: () => Promise<null>,
  env: PatchUserProfileConfig = defaultEnv
): Promise<APIGatewayProxyResult> {
  setEnv(env);
  vi.mock('@services/stores/user-base-store');
  const userBaseStoreMock = {
    updateUser: vi.fn().mockImplementation(updateUserFn)
  };
  // eslint-disable-next-line @typescript-eslint/unbound-method
  vi.mocked(UserBaseStore.withConfig).mockReturnValue(
    userBaseStoreMock as unknown as UserBaseStore<IdpName>
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  return handler(event as unknown as Event, c);
}

const defaultEnv = {
  decodeAccessJwtConfig: getDefaultDecodeAccessJwtConfig(),
  userBaseStoreConfig: {
    tableName: 'Users-local'
  },
  corsConfig: {
    allowedDomains: ['http://localhost:5173']
  }
};

function setEnv(config: PatchUserProfileConfig): void {
  setEnvDecodeAccessJwtConfig(config.decodeAccessJwtConfig);
  setEnvUserBaseStoreConfig(config.userBaseStoreConfig);
  setEnvBaseConfig(config.corsConfig);
}
