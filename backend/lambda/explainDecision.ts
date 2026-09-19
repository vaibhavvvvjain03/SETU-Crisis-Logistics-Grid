import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const dbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dbClient);
const bedrock = new BedrockRuntimeClient({});

export const handler = async (event: any) => {
  console.log("Explaining decision for recommendation:", event.recommendationId);
  const { recommendationId, batchId } = event;

  const recommendationTable = process.env.RECOMMENDATION_TABLE;
  if (!recommendationTable || !recommendationId) {
    throw new Error('Missing table name or recommendationId');
  }

  // Fetch the raw numerical recommendation
  const recData = await docClient.send(new GetCommand({
    TableName: recommendationTable,
    Key: { recommendationId }
  }));

  const rec = recData.Item;
  if (!rec) throw new Error('Recommendation not found');

  const prompt = `You are an AI logistics coordinator briefing.
You have generated a recommendation:
Supply: ${rec.supply}
Destinations: ${JSON.stringify(rec.destinations)}

Explain this decision in 3-4 clear sentences. DO NOT change the numbers. DO NOT recommend different amounts. Just explain that the supply is being routed to these destinations due to critical shortages detected in the field.`;

  let explanation = "Decision explained deterministically (Bedrock fallback).";
  let confidence = 0.99;

  try {
    const bedrockParams = {
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    };

    const bedrockResponse = await bedrock.send(new InvokeModelCommand(bedrockParams));
    const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
    explanation = responseBody.content[0].text;
    console.log("Bedrock explanation generated successfully.");
  } catch (error) {
    console.error("Bedrock invocation failed, using fallback:", error);
    // Continue executing without throwing, as deterministic logic is primary.
  }

  // Update the recommendation with the reason
  await docClient.send(new UpdateCommand({
    TableName: recommendationTable,
    Key: { recommendationId },
    UpdateExpression: 'set reason = :r, confidence = :c',
    ExpressionAttributeValues: {
      ':r': explanation,
      ':c': confidence
    }
  }));

  return { ...event, explanationGenerated: true };
};
