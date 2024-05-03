import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
  Context
} from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import jwt, { SignOptions } from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { loginConfig } from '../../../resources/config/login.js';

const tokenIdReqFieldName = 'google-id-token';
const logger = new Logger();
const client = new OAuth2Client();

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
  ctx: Context
): Promise<APIGatewayProxyResult> => {  
  return parseReqBody(event.body)
    .then(googleTokenId => verifyGoogleToken(googleTokenId))
    .then(email => lookupUser(email))
    .then(user => generateJwt(user, loginConfig.privateKey))
    .then(jwt => { return {
      statusCode: 200,
      headers: {
        'Set-Authorization': jwt,
        'Set-Refresh-Token': 'WIP'
      },
      body: ''
    }})
    .catch(() => { return {
      statusCode: 401,
      body: ''
    }});
};

function parseReqBody(body: string | null): Promise<jwt> {
  return new Promise((resolve, reject) => {
    if (body) {
      const googleTokenId = JSON.parse(body)[tokenIdReqFieldName];
      googleTokenId ? resolve(googleTokenId) : rejectReqBody(body, reject);
    } else {
      rejectReqBody(body, reject);
    }
  })
}

function rejectReqBody(body: string | null, rejectionFn: () => void): void {
  const msg = `Unexpected request body. It does not contain '${tokenIdReqFieldName}'. Request body: ${body}.`
  logger.warn(msg);
  rejectionFn();
}

function verifyGoogleToken(idToken: string): Promise<email> {
  return client.verifyIdToken({
    idToken: idToken,
    audience: loginConfig.googleClientId
  }).then(ticket => {
    const email = ticket.getPayload()?.['email']
    if (email) {
      return email;
    } else {
      const msg = 'Email could not be extracted out of token id';
      logger.warn(msg);
      throw new Error(msg);
    }
  });
}

const notifycalDB = ['notifycal@gmail.com']

function lookupUser(email: string): Promise<User> {
  if (notifycalDB.includes(email))
    return Promise.resolve({ email: email });
  else {
    // create user in Notifycal
    return Promise.resolve({ email: email });
  }  
}

function generateJwt(user: User, privateKey: string): jwt {
  const tokenPayload = {
    email: user.email,
    role: 'user',
    permissions: {}
  }
  return jwt.sign(tokenPayload, privateKey, {
    algorithm: loginConfig.jwt.algorithm,
    issuer: loginConfig.jwt.issuer,
    expiresIn: loginConfig.jwt.expiresIn  
  } as SignOptions);
}

interface User {
  email: string;
}

type email = string
type jwt = string

