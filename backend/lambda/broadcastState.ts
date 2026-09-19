import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

const dbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dbClient);

export const handler = async (event: any) => {
  console.log("Broadcasting state to WebSockets...");
  
  const connectionTable = process.env.CONNECTION_TABLE;
  const wsEndpoint = process.env.WS_ENDPOINT;
  
  if (!connectionTable || !wsEndpoint) {
    throw new Error('Missing configuration');
  }

  // Determine endpoint, remove protocol if needed
  const endpointUrl = wsEndpoint.replace('wss://', 'https://');
  const apiGw = new ApiGatewayManagementApiClient({ endpoint: endpointUrl });

  // In a real app we'd fetch the actual State, Conflicts, and Recommendations here
  // For the broadcast payload, we will just send a notification event that reconciliation is complete.
  const payload = JSON.stringify({
    type: 'RECONCILIATION_COMPLETE',
    batchId: event.batchId,
    timestamp: new Date().toISOString()
  });

  const connectionsData = await docClient.send(new ScanCommand({
    TableName: connectionTable
  }));

  const connections = connectionsData.Items || [];
  let connectionsNotified = 0;

  for (const conn of connections) {
    try {
      await apiGw.send(new PostToConnectionCommand({
        ConnectionId: conn.connectionId,
        Data: new TextEncoder().encode(payload)
      }));
      connectionsNotified++;
    } catch (err: any) {
      if (err.$metadata?.httpStatusCode === 410 || err.statusCode === 410) {
        console.log(`Connection ${conn.connectionId} is stale. Deleting...`);
        try {
          await docClient.send(new DeleteCommand({
            TableName: connectionTable,
            Key: { connectionId: conn.connectionId }
          }));
        } catch (delErr) {
          console.error(`Failed to delete stale connection ${conn.connectionId}:`, delErr);
        }
      } else {
        console.error(`Failed to send to connection ${conn.connectionId}:`, err);
      }
    }
  }

  return { success: true, connectionsNotified };
};
