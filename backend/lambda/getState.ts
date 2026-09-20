import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dbClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const stateTable = process.env.STATE_TABLE;
    const conflictTable = process.env.CONFLICT_TABLE;
    const recTable = process.env.RECOMMENDATION_TABLE;
    const eventTable = process.env.EVENT_TABLE;

    if (!stateTable || !conflictTable || !recTable || !eventTable) throw new Error('Missing tables');

    const [stateData, conflictData, recData, eventData] = await Promise.all([
      docClient.send(new ScanCommand({ TableName: stateTable })),
      docClient.send(new ScanCommand({ TableName: conflictTable })),
      docClient.send(new ScanCommand({ TableName: recTable })),
      docClient.send(new ScanCommand({ TableName: eventTable }))
    ]);

    const events = (eventData.Items || []).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        state: stateData.Items || [], 
        conflicts: conflictData.Items || [], 
        recommendations: recData.Items || [],
        events: events
      }),
    };
  } catch (error: any) {
    console.error('Failed to get state', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
