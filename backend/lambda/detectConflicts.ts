import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { Event, InventoryState, Conflict, detectConflictsLogic } from '../../shared/schema';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  console.log("Detecting conflicts for batch:", event.batchId);
  const batchId = event.batchId || uuidv4();

  const eventTable = process.env.EVENT_TABLE;
  const stateTable = process.env.STATE_TABLE;
  const conflictTable = process.env.CONFLICT_TABLE;

  if (!eventTable || !stateTable || !conflictTable) {
    throw new Error('Missing table environment variables');
  }

  // 1. Read Inputs
  const eventsData = await docClient.send(new QueryCommand({
    TableName: eventTable,
    IndexName: 'SyncStatusIndex',
    KeyConditionExpression: 'syncStatus = :status',
    ExpressionAttributeValues: { ':status': 'PENDING' }
  }));
  const events = (eventsData.Items || []) as Event[];

  const stateData = await docClient.send(new ScanCommand({
    TableName: stateTable,
  }));
  const state = (stateData.Items || []) as InventoryState[];

  // 2. Execute Business Logic
  const conflicts = detectConflictsLogic(events, state);

  // 3. Write Outputs
  for (const conflict of conflicts) {
    await docClient.send(new PutCommand({
      TableName: conflictTable,
      Item: conflict
    }));
  }

  return { batchId, conflictsDetected: conflicts.length };
};

