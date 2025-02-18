import { faker } from '@faker-js/faker';

const MAX_NUMBER_OF_CALENDARS = 10;

function generateTimestamps() {
  /** Generate a random timestamp within the last year */
  const now = Date.now();
  const past = now - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000);
  return { signedUpAt: past, lastSignInAt: now };
}

function generateRandomUserCalendars() {
  const numberOfCalendars = Math.floor(Math.random() * MAX_NUMBER_OF_CALENDARS) + 1;
  return Array.from({ length: numberOfCalendars }).map((_) => ({
    name: `${faker.person.fullName()} Calendar`,
    id: `${faker.string.alphanumeric(20)}@google.com`
  }));
}

function generateUser() {
  /** Generate a fake user */
  const timestamps = generateTimestamps();

  return {
    userId: faker.string.uuid(),
    signedUpAt: timestamps.signedUpAt.toString(),
    lastSignInAt: timestamps.lastSignInAt.toString(),
    idp: faker.helpers.arrayElement(['google.com']),
    idpId: faker.string.ulid(),
    config: {
      businessName: faker.company.name(),
      businessAddress: faker.location.streetAddress(),
      calendars: generateRandomUserCalendars()
    },
    userStatus: faker.helpers.arrayElement(['live', 'onboarding', 'banned']),
    idpAuthorization: {
      refreshToken: faker.internet.jwt()
    },
    email: faker.internet.email()
  };
}

function generateItem(user) {
  /** Generate an item based on the fake user data */
  return {
    Item: {
      UserId: { S: user.userId },
      Idp: { S: user.idp },
      IdpId: { S: user.idpId },
      SignedUpAt: { N: user.signedUpAt },
      LastSignInAt: { N: user.lastSignInAt },
      Config: {
        M: {
          businessName: { S: user.config.businessName },
          businessAddress: { S: user.config.businessAddress },
          calendars: {
            L: user.config.calendars.map((c) => ({
              M: {
                name: { S: c.name },
                id: { S: c.id }
              }
            }))
          }
        }
      },
      UserStatus: { S: faker.helpers.arrayElement(['live', 'onboarding', 'banned']) },
      IdpAuthorization: {
        M: {
          refreshToken: { S: user.idpAuthorization.refreshToken }
        }
      },
      Email: { S: user.email }
    }
  };
}

function generateBatch(batchSize) {
  /** Generate a batch of items */
  const users = Array.from({ length: batchSize }, generateUser);
  return users.map(generateItem);
}

// Run and save the batch
const batchSize = process.argv[2] ? parseInt(process.argv[2], 10) : 10;
const batchData = generateBatch(batchSize);

console.log(JSON.stringify(batchData, null, 4));
