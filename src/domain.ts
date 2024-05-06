import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ScanCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const getUsers = async (usersTable: string) => {
  // The future might require pagination
  const client = new DynamoDBClient({ region: process.env.AWS_REGION });
  const documentClient = DynamoDBDocumentClient.from(client);

  const command = new ScanCommand({
    TableName: usersTable
  });

  const response = await documentClient.send(command);
  return response.Items;
};

export const getActionableEvents = async () => {};
