import { describe, expect, it } from 'vitest';

import { objectToQueryString, queryStringToObject } from './queryString';

// It's probably not 100% safe to parse primitive values. (ie: "true" as a string, or a number as a string: "0034678000789")
const validTestCases = {
  empty: {
    obj: {},
    qsp: ['']
  },
  simple: {
    obj: {
      name: 'John Doe',
      age: '30',
      interests: ['swimming', 'archery']
    },
    qsp: ['name=John%20Doe', 'age=30', 'interests%5B0%5D=swimming', 'interests%5B1%5D=archery']
  },
  nested: {
    obj: {
      user: {
        name: 'Alice',
        age: '27',
        preferences: {
          theme: 'dark'
        }
      }
    },
    qsp: ['user%5Bname%5D=Alice', 'user%5Bage%5D=27', 'user%5Bpreferences%5D%5Btheme%5D=dark']
  },
  arraysInObjects: {
    obj: {
      user: {
        preferences: {
          notifications: ['email', 'sms']
        }
      }
    },
    qsp: [
      'user%5Bpreferences%5D%5Bnotifications%5D%5B0%5D=email',
      'user%5Bpreferences%5D%5Bnotifications%5D%5B1%5D=sms'
    ]
  },
  specialCharacters: {
    obj: {
      query: 'hello world!',
      category: 'science & tech'
    },
    qsp: ['query=hello%20world%21', 'category=science%20%26%20tech']
  },
  float: {
    obj: {
      floatValue: '9.34'
    },
    qsp: ['floatValue=9.34']
  },
  realObject: {
    obj: {},
    qsp: ['']
  }
};

describe('Working with query strings', () => {
  describe('Transforming objects to query string', () => {
    it.each(Object.entries(validTestCases))(
      'should correctly transform %s object to query string',
      (_, { obj, qsp }) => {
        const result = objectToQueryString(obj);
        const resultSet = new Set(result.split('&'));
        const expectedSet = new Set(qsp);

        expect(resultSet).toStrictEqual(expectedSet);
      }
    );
  });

  describe('Transforming query string back to object', () => {
    it.each(Object.entries(validTestCases))(
      'should correctly transform %s query string back to object',
      (_, { obj, qsp }) => {
        const queryString = qsp.join('&'); // Simulate query string from array
        const result = queryStringToObject(queryString);

        expect(result).toStrictEqual(obj);
      }
    );
  });
});
