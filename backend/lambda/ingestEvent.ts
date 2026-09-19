import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const tableName = process.env.EVENT_TABLE;
    if (!tableName) throw new Error('EVENT_TABLE environment variable is missing.');
    if (!event.body) throw new Error('Request body is missing.');

    const payload = JSON.parse(event.body);
    // Add server-side timestamp as an extra safety measure, though we trust the device timestamp
    // since this is an offline-first app. We'll store it exactly as given in the payload.

    const command = new PutCommand({
      TableName: tableName,
      Item: payload,
      ConditionExpression: 'attribute_not_exists(eventId)',
    });

    try {
      await docClient.send(command);
    } catch (putErr: any) {
      if (putErr.name === 'ConditionalCheckFailedException') {
        // Event already exists, treat as idempotent success
        console.log(`Event ${payload.eventId} already exists, skipping duplicate ingestion.`);
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ message: 'Event already ingested', eventId: payload.eventId }),
        };
      }
      throw putErr;
    }

    return {
      statusCode: 201,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Event successfully ingested', eventId: payload.eventId }),
    };
  } catch (error: any) {
    console.error('Error ingesting event:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Failed to ingest event', error: error.message }),
    };
  }
};
