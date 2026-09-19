import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. DynamoDB Tables
    const eventTable = new dynamodb.Table(this, 'EventTable', {
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });
    eventTable.addGlobalSecondaryIndex({
      indexName: 'SyncStatusIndex',
      partitionKey: { name: 'syncStatus', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    const stateTable = new dynamodb.Table(this, 'StateTable', {
      partitionKey: { name: 'locationId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'item', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });

    const conflictTable = new dynamodb.Table(this, 'ConflictTable', {
      partitionKey: { name: 'conflictId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });

    const recommendationTable = new dynamodb.Table(this, 'RecommendationTable', {
      partitionKey: { name: 'recommendationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });

    const connectionTable = new dynamodb.Table(this, 'ConnectionTable', {
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });

    // 2. EventBus
    const bus = new events.EventBus(this, 'SetuEventBus', {
      eventBusName: 'SetuEventBus',
    });

    // 3. Lambda Common Props
    const lambdaProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      bundling: { minify: true },
      timeout: cdk.Duration.seconds(10),
      environment: {
        EVENT_TABLE: eventTable.tableName,
        STATE_TABLE: stateTable.tableName,
        CONFLICT_TABLE: conflictTable.tableName,
        RECOMMENDATION_TABLE: recommendationTable.tableName,
        CONNECTION_TABLE: connectionTable.tableName,
        EVENT_BUS_NAME: bus.eventBusName,
      },
    };

    // 4. Lambdas
    const ingestEventFn = new nodejs.NodejsFunction(this, 'IngestEvent', {
      entry: path.join(__dirname, '../lambda/ingestEvent.ts'),
      ...lambdaProps,
    });
    eventTable.grantReadWriteData(ingestEventFn);

    const triggerSyncFn = new nodejs.NodejsFunction(this, 'TriggerSync', {
      entry: path.join(__dirname, '../lambda/triggerSync.ts'),
      ...lambdaProps,
    });
    bus.grantPutEventsTo(triggerSyncFn);

    const getStateFn = new nodejs.NodejsFunction(this, 'GetState', {
      entry: path.join(__dirname, '../lambda/getState.ts'),
      ...lambdaProps,
    });
    stateTable.grantReadData(getStateFn);
    conflictTable.grantReadData(getStateFn);
    recommendationTable.grantReadData(getStateFn);

    const registerSupplyFn = new nodejs.NodejsFunction(this, 'RegisterSupply', {
      entry: path.join(__dirname, '../lambda/registerSupply.ts'),
      ...lambdaProps,
    });
    stateTable.grantReadWriteData(registerSupplyFn);
    bus.grantPutEventsTo(registerSupplyFn);

    const detectConflictsFn = new nodejs.NodejsFunction(this, 'DetectConflicts', {
      entry: path.join(__dirname, '../lambda/detectConflicts.ts'),
      ...lambdaProps,
    });
    eventTable.grantReadData(detectConflictsFn);
    stateTable.grantReadData(detectConflictsFn);
    conflictTable.grantReadWriteData(detectConflictsFn);

    const calculateRedistributionFn = new nodejs.NodejsFunction(this, 'CalculateRedistribution', {
      entry: path.join(__dirname, '../lambda/calculateRedistribution.ts'),
      ...lambdaProps,
    });
    stateTable.grantReadData(calculateRedistributionFn);
    conflictTable.grantReadData(calculateRedistributionFn);
    recommendationTable.grantReadWriteData(calculateRedistributionFn);

    const explainDecisionFn = new nodejs.NodejsFunction(this, 'ExplainDecision', {
      entry: path.join(__dirname, '../lambda/explainDecision.ts'),
      ...lambdaProps,
      timeout: cdk.Duration.seconds(30),
    });
    recommendationTable.grantReadWriteData(explainDecisionFn);
    explainDecisionFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: [`arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`],
    }));

    const broadcastStateFn = new nodejs.NodejsFunction(this, 'BroadcastState', {
      entry: path.join(__dirname, '../lambda/broadcastState.ts'),
      ...lambdaProps,
    });
    connectionTable.grantReadWriteData(broadcastStateFn);
    stateTable.grantReadData(broadcastStateFn);
    conflictTable.grantReadData(broadcastStateFn);
    recommendationTable.grantReadData(broadcastStateFn);

    const wsConnectFn = new nodejs.NodejsFunction(this, 'WsConnect', {
      entry: path.join(__dirname, '../lambda/wsConnect.ts'),
      ...lambdaProps,
    });
    connectionTable.grantReadWriteData(wsConnectFn);

    const wsDisconnectFn = new nodejs.NodejsFunction(this, 'WsDisconnect', {
      entry: path.join(__dirname, '../lambda/wsDisconnect.ts'),
      ...lambdaProps,
    });
    connectionTable.grantReadWriteData(wsDisconnectFn);

    // 5. Step Functions Workflow
    const detectTask = new tasks.LambdaInvoke(this, 'Detect Conflicts', {
      lambdaFunction: detectConflictsFn,
      outputPath: '$.Payload',
    }).addRetry({ maxAttempts: 2 });
    const redistributeTask = new tasks.LambdaInvoke(this, 'Calculate Redistribution', {
      lambdaFunction: calculateRedistributionFn,
      outputPath: '$.Payload',
    }).addRetry({ maxAttempts: 2 });
    const explainTask = new tasks.LambdaInvoke(this, 'Explain Decision', {
      lambdaFunction: explainDecisionFn,
      outputPath: '$.Payload',
    }).addRetry({ maxAttempts: 2 });
    const broadcastTask = new tasks.LambdaInvoke(this, 'Broadcast Update', {
      lambdaFunction: broadcastStateFn,
      outputPath: '$.Payload',
    }).addRetry({ maxAttempts: 2 });

    const definition = detectTask
      .next(redistributeTask)
      .next(explainTask)
      .next(broadcastTask);

    const stateMachine = new stepfunctions.StateMachine(this, 'ReconciliationWorkflow', {
      definitionBody: stepfunctions.DefinitionBody.fromChainable(definition),
      stateMachineType: stepfunctions.StateMachineType.EXPRESS,
    });

    // 6. EventBridge Rule to trigger Step Functions
    new events.Rule(this, 'SyncRule', {
      eventBus: bus,
      eventPattern: {
        source: ['SETU.SyncEvent', 'SETU.SupplyEvent'],
      },
      targets: [new targets.SfnStateMachine(stateMachine)],
    });

    // 7. API Gateway (HTTP)
    const httpApi = new apigw.HttpApi(this, 'SetuHttpApi', {
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigw.CorsHttpMethod.ANY],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    httpApi.addRoutes({
      path: '/events',
      methods: [apigw.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('IngestEventInt', ingestEventFn),
    });
    httpApi.addRoutes({
      path: '/sync',
      methods: [apigw.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('TriggerSyncInt', triggerSyncFn),
    });
    httpApi.addRoutes({
      path: '/state',
      methods: [apigw.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetStateInt', getStateFn),
    });
    httpApi.addRoutes({
      path: '/supply',
      methods: [apigw.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('RegisterSupplyInt', registerSupplyFn),
    });
    httpApi.addRoutes({
      path: '/explain',
      methods: [apigw.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('ExplainDecisionInt', explainDecisionFn),
    });

    // 8. API Gateway (WebSocket)
    const wsApi = new apigw.WebSocketApi(this, 'SetuWsApi', {
      connectRouteOptions: { integration: new integrations.WebSocketLambdaIntegration('WsConnectInt', wsConnectFn) },
      disconnectRouteOptions: { integration: new integrations.WebSocketLambdaIntegration('WsDisconnectInt', wsDisconnectFn) },
    });
    const wsStage = new apigw.WebSocketStage(this, 'SetuWsStage', {
      webSocketApi: wsApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    // Grant API Gateway Management API permission to Broadcast Lambda
    broadcastStateFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: [this.formatArn({
        service: 'execute-api',
        resource: wsApi.apiId,
        resourceName: `${wsStage.stageName}/*`,
      })],
    }));
    // Provide endpoint URL to broadcast lambda
    broadcastStateFn.addEnvironment('WS_ENDPOINT', `https://${wsApi.apiId}.execute-api.${this.region}.amazonaws.com/${wsStage.stageName}`);

    // 9. Outputs
    new cdk.CfnOutput(this, 'ApiUrl', { value: httpApi.apiEndpoint });
    new cdk.CfnOutput(this, 'WsUrl', { value: wsStage.url });
  }
}
