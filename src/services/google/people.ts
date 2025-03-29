/* eslint-disable camelcase */
import type { GoogleOAuthConfig } from '@model/Config';
import type { Email } from '@notifycal/shared/types';
import type { PhoneNumberE164 } from '@own-types/model';
import { throwError } from '@services/common/error-handling';
import { google, type people_v1 } from 'googleapis';
import { BaseGoogle } from './base-service';

export class GooglePeople extends BaseGoogle {
  public static withRefreshToken(config: GoogleOAuthConfig, refreshToken: string): GooglePeople {
    return new this(config, refreshToken);
  }

  public getPhoneNumbersBy(email: Email): Promise<Array<PhoneNumberE164>> {
    return this.getContactByEmail(email).then((list) => this.toPhoneNumber(list));
  }

  private extractPhoneNumber(item: people_v1.Schema$PhoneNumber): PhoneNumberE164 | undefined {
    return ((item.canonicalForm || item.value) as PhoneNumberE164) || undefined;
  }

  private toPhoneNumber(item: people_v1.Schema$SearchResponse): Array<PhoneNumberE164> {
    const phoneNumbers = (item.results || []).flatMap((r) => {
      if (r.person && r.person.phoneNumbers) {
        const order = [
          'mobile',
          'main',
          'workMobile',
          'home',
          'work',
          'pager',
          'workPager',
          'googleVoice',
          'other',
          'homeFax',
          'workFax',
          'otherFax'
        ];
        const orderMap = new Map(order.map((type, index) => [type, index]));
        return r.person.phoneNumbers.sort((a, b) => {
          const indexA = orderMap.get(a.type || order[order.length - 1]) ?? order.length;
          const indexB = orderMap.get(b.type || order[order.length - 1]) ?? order.length;
          return indexA - indexB;
        });
      } else {
        return [];
      }
    });
    return phoneNumbers.map((pn) => this.extractPhoneNumber(pn)).filter((v) => v !== undefined);
  }

  private getContactByEmail(email: Email): Promise<people_v1.Schema$SearchResponse> {
    const baseMsg = 'GET People Search contacts';
    const people = google.people({ version: 'v1', auth: this._client });
    const readMaskList = ['emailAddresses', 'phoneNumbers'];
    return people.people
      .searchContacts({ query: email, readMask: readMaskList.join(',') })
      .then((response) => {
        if (response.status >= 200 && response.status <= 299) {
          return response.data;
        } else {
          throwError(`Error in ${baseMsg}. Error in response:`, {}, { response });
        }
      })
      .catch((error) => {
        throwError(`Error in ` + baseMsg, error);
      });
  }
}
