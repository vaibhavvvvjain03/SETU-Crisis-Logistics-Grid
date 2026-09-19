import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { v4 as uuidv4 } from 'uuid';

const dbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dbClient);
const ebClient = new EventBridgeClient({});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const tableName = process.env.STATE_TABLE;
    const busName = process.env.EVENT_BUS_NAME;
    
    if (!tableName || !busName) throw new Error('Missing environment variables.');
    if (!event.body) throw new Error('Request body is missing.');

    const payload = JSON.parse(event.body);
    const item = payload.item || 'Water (L)';
    const quantity = payload.quantity || 4000;

    // Register supply into the warehouse
    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: {
        locationId: 'WH-1',
        item: item,
        confirmedQuantity: quantity,
        unconfirmedQuantity: 0,
        lastVerifiedAt: new Date().toISOString()
      }
    }));

    // Trigger orchestration
    const batchId = uuidv4();
    await ebClient.send(new PutEventsCommand({
      Entries: [
        {
          Source: 'SETU.SupplyEvent',
          DetailType: 'Reconciliation Trigger',
          Detail: JSON.stringify({ batchId, timestamp: new Date().toISOString(), supplyItem: item, supplyQuantity: quantity }),
          EventBusName: busName,
        }
      ]
    }));

    return {
      statusCode: 201,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Supply registered and redistribution triggered', batchId }),
    };
  } catch (error: any) {
    console.error('Error registering supply:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Failed to register supply', error: error.message }),
    };
  }
};
