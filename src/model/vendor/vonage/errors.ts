import { logger } from '@common/powertools';
import type { VonageWebhookMessageStatusPayload } from './schemas';

export type MessageDeliveryErrorFault = 'notifycal' | 'vonage' | 'user' | 'transient' | 'unknown';

// Docs: https://developer.vonage.com/en/api/messages#message-status
export function categorizeError(
  messageStatus: VonageWebhookMessageStatusPayload
): MessageDeliveryErrorFault | 'ok' {
  const { status, error } = messageStatus;
  if (status !== 'rejected' && status !== 'undeliverable') {
    return 'ok';
  }

  if (!error?.error?.title) {
    logger.warn('Missing error title in Vonage status', {
      messageUuid: messageStatus.message_uuid,
      messageStatus
    });
    return 'unknown';
  }

  const errorCode = error.error.title.trim();
  const errorNumber = Number.parseInt(errorCode, 10);

  if (Number.isNaN(errorNumber)) {
    logger.error('Invalid error code format in Vonage status', {
      messageUuid: messageStatus.message_uuid,
      messageStatus,
      errorTitle: error.error.title
    });
    return 'unknown';
  }

  // eslint-disable-next-line no-use-before-define
  return codeMap.get(errorCode) || 'unknown';
}

// curl 'https://developer.vonage.com/api/v1/developer/api/docs/messages?vendorId=vonage' | jq .errors
// Extracted list then gets interpreted by us and every error gets labeled with a fault. If required, a reasoning for the fault is added too.
const codes: Array<{
  code: string;
  description: string;
  fault: MessageDeliveryErrorFault;
  reasoning?: string;
}> = [
  {
    code: '1000',
    description:
      '<p>Throttled - You have exceeded the submission capacity allowed on this account. Please wait and retry</p>\n',
    fault: 'vonage'
  },
  {
    code: '1010',
    description:
      '<p>Missing params - Your request is incomplete and missing some mandatory parameters.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1020',
    description: '<p>Invalid params  -  The value of one or more parameters is invalid.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1021',
    description: '<p>Invalid tag  -  The tag value is invalid.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1022',
    description: '<p>Invalid template  -  Invalid template or template parameters</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1030',
    description:
      '<p>Internal error  -  There was an error processing your request in the Platform.</p>\n',
    fault: 'vonage'
  },
  {
    code: '1040',
    description:
      '<p>Invalid message  -  The Platform was unable to process your request. For example, due to an unrecognised prefix for the phone number.</p>\n',
    fault: 'user'
  },
  {
    code: '1050',
    description:
      '<p>Number barred  -  The number you are trying to submit to is blacklisted and may not receive messages.</p>\n',
    fault: 'user'
  },
  {
    code: '1060',
    description:
      '<p>Partner account barred  -  The <code v-pre="">api_key</code> you supplied is for an account that has been barred from submitting messages.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1070',
    description:
      '<p>Partner quota exceeded  -  Your pre-paid account does not have sufficient credit to process this message.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1080',
    description:
      '<p>Account not enabled for REST  -  This account is not provisioned for REST submission, you should use SMPP on the SMS API.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1090',
    description:
      '<p>Message too long  -  The length of <code v-pre="">udh</code> and <code v-pre="">body</code> was greater than 140 octets for a binary type SMS request.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1100',
    description:
      '<p>Communication Failed  -  Message was not submitted because there was a communication failure.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1120',
    description:
      '<p>Illegal Sender Address - rejected  -  Due to local regulations, the <code v-pre="">SenderID</code> you set in from in the request was not accepted. Please check the Global messaging section.</p>\n',
    fault: 'user',
    reasoning: 'Notifycal does not choose the SenderID'
  },
  {
    code: '1130',
    description:
      '<p>Invalid TTL  -  The value of <code v-pre="">ttl</code> in your request was invalid.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1140',
    description:
      '<p>Facility not allowed  -  Your request makes use of a facility that is not enabled on your account.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1150',
    description:
      '<p>Invalid Message class  -  The value of <code v-pre="">message-</code>class in your request was out of range. See https://en.wikipedia.org/wiki/Data_Coding_Scheme.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1160',
    description:
      '<p>Non White-listed Destination  -  The phone number you set in to is not in your pre-approved destination list. To send messages to this phone number, add it using Dashboard.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1170',
    description:
      '<p>Invalid or Missing Msisdn Param  -  The phone number you supplied in the to parameter of your request was either missing or invalid.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1180',
    description:
      '<p>Absent Subscriber Temporary  -  This message was not delivered because to was temporarily unavailable. For example, the handset used for to was out of coverage or switched off. This is a temporary failure, retry later for a positive result.</p>\n',
    fault: 'user',
    reasoning: 'Notifycal did its job, we want the money for the job done'
  },
  {
    code: '1190',
    description:
      '<p>Absent Subscriber Permanent  -  <code v-pre="">to</code> is no longer active, You should remove this phone number from your database.</p>\n',
    fault: 'user'
  },
  {
    code: '1200',
    description:
      '<p>Portability Error  -  There is an issue after the user has changed carrier for to. If the user wants to receive messages from you, they need to contact their carrier directly.</p>\n',
    fault: 'user',
    reasoning: 'Notifycal did its job, we want the money for the job done'
  },
  {
    code: '1210',
    description:
      '<p>Anti-Spam Rejection  -  Carriers often apply restrictions that block messages following different criteria. For example on SenderID or message content.</p>\n',
    fault: 'user',
    reasoning: 'Notifycal is sure our messages are not spam, we want the money for the job done'
  },
  {
    code: '1220',
    description:
      '<p>Handset Busy  -  The handset associated with to was not available when this message was sent. If status is rejected, this is a temporary failure; retry later for a positive result. If status is submitted, this message has is in the retry scheme and will be resent until it expires in 24-48 hours.</p>\n',
    fault: 'user',
    reasoning: 'Notifycal did its job, we want the money for the job done'
  },
  {
    code: '1230',
    description:
      '<p>Network Error  -  A network failure while sending your message. This is a temporary failure, retry later for a positive result.</p>\n',
    fault: 'transient'
  },
  {
    code: '1240',
    description:
      '<p>Illegal Number  -  You tried to send a message to a blacklisted phone number. That is, the user has already sent a STOP opt-out message and no longer wishes to receive messages from you.</p>\n',
    fault: 'user'
  },
  {
    code: '1241',
    description: '<p>Too many send requests  -  Too many send requests to phone numbers.</p>\n',
    fault: 'user',
    reasoning: 'Notifycal is sure we are not hammering anyone unless they tell us to'
  },
  {
    code: '1250',
    description:
      '<p>Unroutable  -  The chosen route to send your message is not available. This is because the phone number is either currently on an unsupported network or on a pre-paid or reseller account that could not receive a message.</p>\n',
    fault: 'unknown'
  },
  {
    code: '1251',
    description:
      '<p>Unable to route traffic to a destination  - This may be due to the routing rules applied for your destination network.</p>\n',
    fault: 'unknown'
  },
  {
    code: '1260',
    description:
      '<p>Destination unreachable  -  The message could not be delivered to the phone number. If using Viber Business Messages your account might not be enabled for this country.</p>\n',
    fault: 'unknown'
  },
  {
    code: '1270',
    description:
      '<p>Subscriber Age Restriction  -  The carrier blocked this message because the content is not suitable for to based on age restrictions.</p>\n',
    fault: 'user'
  },
  {
    code: '1280',
    description:
      "<p>Number Blocked by Carrier  -  The carrier blocked this message. This could be due to several reasons. For example, to's plan does not include SMS or the account is suspended.</p>\n",
    fault: 'user'
  },
  {
    code: '1282',
    description:
      '<p>Message blocked by provider - The messaging provider has chosen to block this message. This may be due to content or restrictions imposed by the provider.</p>\n',
    fault: 'user'
  },
  {
    code: '1290',
    description:
      '<p>Pre-Paid - Insufficient funds  -  to’s pre-paid account does not have enough credit to receive the message.</p>\n',
    fault: 'user'
  },
  {
    code: '1300',
    description:
      '<p>Not part of the provider network  -  The number or ID is not a user in the provider network.</p>\n',
    fault: 'vonage'
  },
  {
    code: '1310',
    description: "<p>Not suitable device  -  The user's device can't receive the message.</p>\n",
    fault: 'user'
  },
  {
    code: '1320',
    description: '<p>Message already sent  -  The message was already sent.</p>\n',
    fault: 'user',
    reasoning: 'Notifycal is sure we are not sending duplicates anyone unless they tell us to'
  },
  {
    code: '1330',
    description:
      '<p>Unknown  -  An unknown error was received from the carrier who tried to send this this message. Depending on the carrier, that to is unknown. When you see this error, and status is rejected, always check if to in your request was valid.</p>\n',
    fault: 'unknown'
  },
  {
    code: '1331',
    description:
      '<p>Provider error  -  The provider is not responding or unable to process the request. Please try sending your message in a few minutes time.</p>\n',
    fault: 'vonage'
  },
  {
    code: '1340',
    description:
      '<p>Outside of the allowed window  -  This message is sent outside of allowed response window.</p>\n',
    fault: 'unknown'
  },
  {
    code: '1350',
    description:
      '<p>Phone matching fee not paid  -  Requires phone matching access fee to be paid by the Facebook Page.</p>\n',
    fault: 'user'
  },
  {
    code: '1360',
    description: '<p>TTL was activated, or message expired before delivered.</p>\n',
    fault: 'vonage'
  },
  {
    code: '1370',
    description:
      '<p>Expired access Token - Please reauthenticate your Facebook Page with Vonage.</p>\n',
    fault: 'unknown'
  },
  {
    code: '1380',
    description:
      '<p>Invalid resource - Please check that the URL your provided to your resource is accessible and valid.</p>\n',
    fault: 'unknown'
  },
  {
    code: '1381',
    description: '<p>Resource size is too large - Please try sending a smaller media file.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1382',
    description:
      '<p>Resource type is invalid - Please check that the file you are trying to send is valid.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1400',
    description:
      '<p>Unsupported channel - The channel specified in the request is not supported.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1410',
    description:
      '<p>Invalid channel parameters -  The value of one or more parameters is invalid.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1420',
    description:
      '<p>Invalid sender -  The <code v-pre="">from</code> parameter is invalid for the given channel.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1430',
    description:
      '<p>Invalid recipient -  The <code v-pre="">to</code> parameter is invalid for the given channel.</p>\n',
    fault: 'user'
  },
  {
    code: '1440',
    description:
      '<p>Invalid message type - The message type specified in the request is not supported for the given channel.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1450',
    description:
      '<p>Invalid client reference -  The client reference can be a string of up to 100 characters.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1451',
    description:
      '<p>Invalid context - the reference to the original message could not be found because it is invalid or no longer available.</p>\n',
    fault: 'vonage'
  },
  {
    code: '1460',
    description:
      '<p>Daily message limit exceeded - Check compliance with regulations such as 10DLC.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1461',
    description:
      '<p>Auto-limiting of messages by Provider - This message was not delivered by Provider to avoid excessive messages to the end user. For details please see this <link-wrapper href="https://api.support.vonage.com/hc/en-us/articles/17270698783516-WhatsApp-Per-User-Marketing-Template-Messaging-Limits">knowledgebase article</link-wrapper>.</p>\n',
    fault: 'user',
    reasoning: 'Notifycal is sure we are not sending duplicates anyone unless they tell us to'
  },
  {
    code: '1470',
    description: '<p>Fraud Defender Traffic Rule - Rejected due to prefix block list.</p>\n',
    fault: 'user'
  },
  {
    code: '1472',
    description: '<p>Fraud Defender SMS Burst Protection  - Traffic limit has been reached</p>\n',
    fault: 'user'
  },
  {
    code: '1473',
    description:
      '<p>AIT Protection - The message has been rejected by Fraud Defender AIT Protection</p>\n',
    fault: 'user'
  },
  {
    code: '1480',
    description:
      '<p>Entity Filter - The message failed due to <code v-pre="">entity_id</code> being incorrect or not provided. <link-wrapper href="https://api.support.vonage.com/hc/en-us/sections/200622473-Country-Specific-Features-and-Restrictions">More information on country specific regulations</link-wrapper>.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1481',
    description:
      '<p>Header Filter - The message failed because the header ID (<code v-pre="">from</code> phone number) was incorrect or missing. <link-wrapper href="https://api.support.vonage.com/hc/en-us/sections/200622473-Country-Specific-Features-and-Restrictions">More information on country specific regulations</link-wrapper>.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1482',
    description:
      '<p>Content Filter - The message failed due to <code v-pre="">content_id</code> being incorrect or not provided. <link-wrapper href="https://api.support.vonage.com/hc/en-us/sections/200622473-Country-Specific-Features-and-Restrictions">More information on country specific regulations</link-wrapper>.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1483',
    description:
      '<p>Consent Filter - The message failed due to consent not being authorized. <link-wrapper href="https://api.support.vonage.com/hc/en-us/sections/200622473-Country-Specific-Features-and-Restrictions">More information on country specific regulations</link-wrapper>.</p>\n',
    fault: 'notifycal'
  },
  {
    code: '1484',
    description:
      '<p>Regulation Error - Unexpected regulation error - contact <link-wrapper href="mailto:$%7BCUSTOMER_SUPPORT_EMAIL%7D">support</link-wrapper>.</p>\n',
    fault: 'notifycal'
  }
];

const codeMap = new Map<string, MessageDeliveryErrorFault>(
  codes.map((c) => [c.code.trim(), c.fault])
);
