# ARCHITECTURE.md — SETU

The Ship It stack offered by the event includes Lambda, API Gateway, DynamoDB, S3, Bedrock, Amplify Hosting/App Runner, Cognito, EventBridge, and Step Functions. SETU uses only services that directly support the demonstrated flow; optional integrations must not block the core.

## 1. Frontend
- **Framework:** Next.js + TypeScript
- **Styling/animation:** Tailwind, Framer Motion
- **Validation:** Zod (validate every event payload client-side before it enters the IndexedDB queue or hits the API)
- **Hosting:** AWS Amplify Hosting

## 2. Offline Layer (client)
- **IndexedDB**: local event queue. Schema mirrors the EVENT shape below so queued and synced events are structurally identical.
- **Service Worker**: supports background sync for the IndexedDB queue. The application writes events to IndexedDB when the network is unavailable; the Service Worker registers a background-sync task and flushes queued events when connectivity returns.
- This layer must be genuinely tested against a real dropped connection (browser devtools network throttling → offline), not only the in-app Network State Simulator, which is a *display* of this real mechanism, not a substitute for it.

## 3. API Layer
- **Amazon API Gateway** — REST endpoints:
  - `POST /events` — ingest a single event (used both for online submissions and for the Service Worker's background sync flush)
  - `POST /sync` — trigger reconciliation over a batch of newly-arrived events (also triggerable via EventBridge, see §6)
  - `GET /state` — command center read (current INVENTORY_STATE, open CONFLICTs, active RECOMMENDATIONs)
  - `POST /supply` — register a new incoming supply, triggers redistribution calculation

## 4. Compute
- **AWS Lambda**, one function per responsibility (kept separate so each can be tested standalone before wiring together):
  - `ingestEvent` — writes to Events table
  - `detectConflicts` — deterministic conflict-detection logic
  - `calculateRedistribution` — deterministic allocation logic
  - `explainDecision` — calls Bedrock with the CONFLICT/RECOMMENDATION JSON, returns plain-language text
- **Deterministic vs. AI boundary (do not blur):** `detectConflicts` and `calculateRedistribution` never call an LLM and never estimate — pure logic over stored data. `explainDecision` never invents or recomputes a number; it only narrates numbers it's given.

## 5. Database — Amazon DynamoDB
Full entity model (per original PS §6), one table per entity unless noted:
- **DISASTER** — disasterId, name, type, status
- **LOCATION** — locationId, type (CAMP/WAREHOUSE/CHECKPOINT), population, coordinates
- **INVENTORY_STATE** — locationId, item, confirmedQuantity, unconfirmedQuantity, lastVerifiedAt
- **EVENT** — eventId, deviceId, actorId, locationId, eventType, timestamp, payload, syncStatus (append-only; this is the source of truth log)
- **SHIPMENT** — shipmentId, origin, destination, item, quantity, dispatchTime, deliveryStatus
- **CONFLICT** — conflictId, relatedEvents, conflictType, severity, resolution, evidence
- **REQUEST** — requestId, locationId, item, quantity, urgency, status
- **RECOMMENDATION** — recommendationId, supply, destinations, quantities, reason, confidence/evidence

Use GSIs on EVENT (locationId + timestamp) and SHIPMENT (destination + dispatchTime) to support the reconciliation queries efficiently.

## 6. Orchestration
- **Amazon EventBridge** — triggers the Step Functions workflow for an explicit reconciliation batch. The client flushes queued events through `/events`, then requests reconciliation through `/sync`; EventBridge carries that reconciliation event into Step Functions.
- **AWS Step Functions** — the reconciliation workflow, exactly as specified:
  ```
  SYNC → VALIDATE EVENTS → DETECT DUPLICATES → DETECT CONFLICTS
       → RECONCILE STATE → CALCULATE SHORTAGE PRIORITY
       → GENERATE RECOMMENDATION → BEDROCK EXPLANATION
       → UPDATE COMMAND CENTER
  ```
  Each state maps to one of the Lambdas in §4 (or a thin state-transition Lambda where no dedicated function exists yet).

## 7. AI — Amazon Bedrock
- Input: one RECOMMENDATION record + its related CONFLICT records, as JSON.
- Output: 3–4 sentence coordinator briefing in plain language.
- Constraint: must echo input figures exactly — never restate a number differently than given. Enforce via a strict prompt template plus a post-generation check (regex/number-extraction diff against input) if time allows.

## 8. Object Storage — Amazon S3
- Uploaded manifests, evidence photos, incident documents, optional field attachments referenced from EVENT payloads.

## 9. Auth — Amazon Cognito
- Role-based groups: Coordinator, Camp, Warehouse, Driver.
- For a genuine Cognito demo, use pre-provisioned demo identities/groups (Coordinator/Camp/Warehouse/Driver) and authenticate them before entering the role-specific experience. A visual role selector may choose among those pre-provisioned demo roles, but it must not claim to mint a real Cognito token without authentication. If Cognito becomes schedule-risky, keep it out of the critical path rather than faking authentication.

## 10. Data Flow Summary
```
Client (offline-capable PWA)
   → IndexedDB queue (if offline) → Service Worker background sync
   → API Gateway → Lambda (ingestEvent) → DynamoDB (Events table)
   → POST /sync → EventBridge → Step Functions
        → Lambda (detectConflicts) → DynamoDB (Conflict table)
        → Lambda (calculateRedistribution) → DynamoDB (Recommendation table)
        → Lambda (explainDecision) → Bedrock → back into Recommendation record
   → API Gateway (GET /state) → Command Center dashboard (near-real-time read)
```

## 11. IAM notes
- Each Lambda gets a scoped execution role: table-level read/write only on the tables it needs (e.g., `detectConflicts` needs Events + Conflict read/write, not Recommendation write).
- API Gateway routes are authorized via Cognito role groups (Coordinator-only for `/state` and `/supply`; all roles for `/events`).
- Bedrock invocation permission scoped to the `explainDecision` Lambda's role only.
