/* eslint-disable camelcase */
import { logger } from '@common/powertools';
import type { Email, PhoneNumber } from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';
import { fakeIdpConfigs } from '@testing/utils/config';
import { google, type people_v1 } from 'googleapis';
import type { GaxiosResponse } from 'googleapis-common';
import { describe, expect, it, vi } from 'vitest';
import { GooglePeople } from './people';

describe('GooglePeople Service', () => {
  const validGooglePeopleResponse: GaxiosResponse<people_v1.Schema$SearchResponse> = {
    data: {
      results: [
        {
          person: {
            phoneNumbers: [{ canonicalForm: '+1234567890' }, { value: '+0987654321' }]
          }
        }
      ]
    },
    config: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    request: {
      responseURL: ''
    }
  };

  it('should fetch contact by email and return phone numbers', () => {
    const searchContactsFn = () => Promise.resolve(validGooglePeopleResponse);

    return testit(searchContactsFn).then((result) => {
      expect(result).toStrictEqual(['+1234567890', '+0987654321'] as Array<PhoneNumber>);
    });
  });

  it('should return phone number list ordered. Mobile types first', () => {
    const searchContactsFn = () =>
      Promise.resolve({
        ...validGooglePeopleResponse,
        data: {
          results: [
            {
              person: {
                phoneNumbers: [
                  { canonicalForm: '+2', type: 'main' },
                  { canonicalForm: '+1', type: 'mobile' },
                  { canonicalForm: '+3', type: 'home' }
                ]
              }
            }
          ]
        }
      });

    return testit(searchContactsFn).then((result) => {
      expect(result).toStrictEqual(['+1', '+2', '+3'] as Array<PhoneNumber>);
    });
  });

  it('should return undefined if no phone numbers are found', () => {
    const emptyResponse: GaxiosResponse<people_v1.Schema$SearchResponse> = {
      data: { results: [] },
      config: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      request: { responseURL: '' }
    };
    const searchContactsFn = () => Promise.resolve(emptyResponse);

    return testit(searchContactsFn).then((result) => {
      expect(result).toStrictEqual([]);
    });
  });

  it('should throw an error if the API call fails', () => {
    const error = new Error('Boom! Google API Failure');
    const searchContactsFn = () => Promise.reject(error);

    const result = testit(searchContactsFn);

    return expect(result).rejects.toThrow(`Error in GET People Search contacts`);
  });

  function testit(
    searchContactsFn: () => Promise<GaxiosResponse<people_v1.Schema$SearchResponse>>,
    config = fakeIdpConfigs['google.com']
  ): Promise<Array<PhoneNumberE164>> {
    vi.mock('googleapis');
    vi.mocked(google.people).mockReturnValue({
      people: {
        searchContacts: vi.fn().mockImplementation(searchContactsFn)
      }
    } as unknown as people_v1.People);
    return GooglePeople.withRefreshToken(config, 'some-refresh-token', logger).getPhoneNumbersBy(
      'test@example.com' as Email
    );
  }
});
