import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { v4 as uuidv4 } from 'uuid';

const client = new EventBridgeClient({});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const batchId = uuidv4();
    
    await client.send(new PutEventsCommand({
      Entries: [
        {
          Source: 'SETU.SyncEvent',
          DetailType: 'Reconciliation Trigger',
          Detail: JSON.stringify({ batchId, timestamp: new Date().toISOString() }),
          EventBusName: 'default',
        }
      ]
    }));

    return {
      statusCode: 202,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'Sync batch accepted and triggering reconciliation.', batchId }),
    };
  } catch (error) {
    console.error('Failed to put event on EventBridge', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
