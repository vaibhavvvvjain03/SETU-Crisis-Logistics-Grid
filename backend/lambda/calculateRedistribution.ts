import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { InventoryState, Conflict, Recommendation, calculateRedistributionLogic } from '../../shared/schema';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  console.log("Calculating redistribution for batch:", event.batchId);
  
  const recommendationTable = process.env.RECOMMENDATION_TABLE;
  const stateTable = process.env.STATE_TABLE;
  const conflictTable = process.env.CONFLICT_TABLE;
  
  if (!recommendationTable || !stateTable || !conflictTable) {
    throw new Error('Missing table environment variables');
  }

  // 1. Read Inputs
  const stateData = await docClient.send(new ScanCommand({
    TableName: stateTable,
  }));
  const state = (stateData.Items || []) as InventoryState[];

  const conflictData = await docClient.send(new ScanCommand({
    TableName: conflictTable,
  }));
  const conflicts = (conflictData.Items || []) as Conflict[];

  // 2. Execute Business Logic
  const recommendations = calculateRedistributionLogic(state, conflicts);

  // 3. Write Outputs
  let recommendationId = null;
  for (const rec of recommendations) {
    await docClient.send(new PutCommand({
      TableName: recommendationTable,
      Item: rec
    }));
    recommendationId = rec.recommendationId; // Just take the last one for the event payload hack
  }

  return { ...event, recommendationId };
};

