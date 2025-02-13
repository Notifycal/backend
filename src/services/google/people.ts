/* eslint-disable camelcase */
import type { Email, PhoneNumber } from '@notifycal/shared/types';
import { throwError } from '@services/common/error-handling';
import { google, type people_v1 } from 'googleapis';
import { ImpersonatedBaseGoogle } from './base-service';

export class GooglePeople extends ImpersonatedBaseGoogle {
  public static withRefreshToken(refreshToken: string): GooglePeople {
    return new this(refreshToken);
  }

  public getPhoneNumbersBy(email: Email): Promise<Array<PhoneNumber>> {
    return this.getContactByEmail(email).then((list) => this.toPhoneNumber(list));
  }

  private extractPhoneNumber(item: people_v1.Schema$PhoneNumber): PhoneNumber | undefined {
    return ((item.canonicalForm || item.value) as PhoneNumber) || undefined;
  }

  private toPhoneNumber(item: people_v1.Schema$SearchResponse): Array<PhoneNumber> {
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
          throwError(`${baseMsg}. Error in response: ${JSON.stringify(response)}`);
        }
      })
      .catch((error) => {
        throwError(`${baseMsg}. ${error}`);
      });
  }
}
