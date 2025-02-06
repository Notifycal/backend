/* eslint-disable camelcase */
import type { GoogleOAuthConfig } from '@model/Config';
import type { Email, PhoneNumber } from '@notifycal/shared/types';
import { throwError } from '@services/common/error-handling';
import { google, type people_v1 } from 'googleapis';
import { BaseGoogle } from './base-service';

export class GooglePeople extends BaseGoogle {
  public static withRefreshToken(config: GoogleOAuthConfig, refreshToken: string): GooglePeople {
    return new this(config, refreshToken);
  }

  public getPhoneNumbersBy(email: Email): Promise<Array<PhoneNumber> | undefined> {
    return this.getContactByEmail(email).then((list) => this.toPhoneNumber(list));
  }

  private extractPhoneNumber(item: people_v1.Schema$PhoneNumber): PhoneNumber | undefined {
    return ((item.canonicalForm || item.value) as PhoneNumber) || undefined;
  }

  private toPhoneNumber(item: people_v1.Schema$SearchResponse): Array<PhoneNumber> | undefined {
    const phoneNumbers = (item.results || []).flatMap((r) => {
      if (r.person && r.person.phoneNumbers) {
        return r.person.phoneNumbers;
      } else {
        return [];
      }
    });
    const list = phoneNumbers
      .map((pn) => this.extractPhoneNumber(pn))
      .filter((v) => v !== undefined);
    if (list.length > 0) {
      return list;
    } else {
      return undefined;
    }
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
