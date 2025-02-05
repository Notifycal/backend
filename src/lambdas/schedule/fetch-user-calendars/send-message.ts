import { PublishCommand, type PublishCommandOutput } from '@aws-sdk/client-sns';
import { snsClient } from '@clients/sns';

const sns = snsClient();

export const transformItem = <T>(item: T): T => {
  // This function does user x calendar list and transforms the items into SNS messages
  return item;
};

export const publishToSNSCalendarMessage = (
  messageBody: { id: string } & object,
  topic: string
): Promise<PublishCommandOutput> => {
  const publishCommand = new PublishCommand({
    TopicArn: topic,
    Message: JSON.stringify({
      default: JSON.stringify(messageBody)
    }),
    MessageDeduplicationId: messageBody.id || '',
    MessageGroupId: '1',
    MessageStructure: 'json'
  });
  return sns.send(publishCommand);
};
