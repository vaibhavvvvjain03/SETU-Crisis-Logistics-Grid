import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const dbClient = new DynamoDBClient({ region: 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(dbClient);

// Minimal protection: require a known reset token so a random visitor
// cannot wipe the backend just by hitting this URL.
// In production this would be a Cognito-protected admin action.
const RESET_TOKEN = process.env.DEMO_RESET_TOKEN || 'setu-hackathon-2024-reset';

const TABLES = [
  { name: 'SetuBackendStack-EventTable3F3CD4B2-1OGZEKYP7EC7M', key: 'eventId' },
  { name: 'SetuBackendStack-StateTable9728C7E5-MVF2D8BYPW3G', key: 'locationId', sortKey: 'item' },
  { name: 'SetuBackendStack-ConflictTable73DE35AE-131T0TJWM0NKO', key: 'conflictId' },
  { name: 'SetuBackendStack-RecommendationTable49B878D6-KWQSGSN4477X', key: 'recommendationId' },
  { name: 'SetuBackendStack-ConnectionTable0C6E1E44-3UTEFJGYRAAU', key: 'connectionId' },
];

async function clearTable(tableDef: { name: string; key: string; sortKey?: string }) {
  try {
    const scanResponse = await docClient.send(new ScanCommand({ TableName: tableDef.name }));
    const items = scanResponse.Items || [];
    console.log(`Clearing ${items.length} items from ${tableDef.name}`);
    for (const item of items) {
      const keyObj: Record<string, unknown> = { [tableDef.key]: item[tableDef.key] };
      if (tableDef.sortKey) keyObj[tableDef.sortKey] = item[tableDef.sortKey];
      await docClient.send(new DeleteCommand({ TableName: tableDef.name, Key: keyObj }));
    }
  } catch (err) {
    console.error(`Failed to clear ${tableDef.name}:`, err);
  }
}

export async function POST(request: Request) {
  // Security gate: require the demo reset token
  const providedToken = request.headers.get('x-reset-token');
  if (!providedToken || providedToken !== RESET_TOKEN) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Missing or invalid reset token.' },
      { status: 401 }
    );
  }

  try {
    for (const table of TABLES) {
      await clearTable(table);
    }
    return NextResponse.json({ success: true, message: 'Backend state reset successfully.' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
