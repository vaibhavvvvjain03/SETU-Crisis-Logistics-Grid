import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId;
  const tableName = process.env.CONNECTION_TABLE;

  if (connectionId && tableName) {
    await docClient.send(new DeleteCommand({
      TableName: tableName,
      Key: { connectionId },
    }));
  }

  return { statusCode: 200, body: 'Disconnected.' };
};
