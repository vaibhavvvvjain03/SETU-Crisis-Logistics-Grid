import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId;
  const tableName = process.env.CONNECTION_TABLE;

  if (connectionId && tableName) {
    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: { connectionId, connectedAt: new Date().toISOString() },
    }));
  }

  return { statusCode: 200, body: 'Connected.' };
};
