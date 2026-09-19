# PRD.md — SETU

## 1. Roles (mocked via a role selector, real Cognito groups behind it)
- **Coordinator** — sees the command center, resolves conflicts, triggers redistribution, views Bedrock explanations.
- **Camp** — reports stock levels, submits requests, confirms/denies deliveries.
- **Warehouse** — records dispatches.
- **Driver** — records route status (diverted, delivered, delayed).

No self-registration flow needed. Cognito issues role-scoped sessions from a simple picker — this is still real Cognito usage, just without a signup UI to build.

## 2. The Core Loop (the single most important flow — build and polish this before anything else)

```
Field actor submits event (online or offline)
        ↓
[If offline] Event queued in IndexedDB → Service Worker background sync
        ↓
Event(s) POST to API Gateway → Lambda → written to DynamoDB Events table
        ↓
Sync batch triggers EventBridge → Step Functions workflow:
   VALIDATE → DEDUPLICATE → DETECT CONFLICTS → RECONCILE STATE
   → CALCULATE SHORTAGE PRIORITY → GENERATE RECOMMENDATION → BEDROCK EXPLANATION
        ↓
Reconciled State + Conflicts + Recommendation written to DynamoDB State/Conflict/Recommendation tables
        ↓
Command Center dashboard reflects new state in near-real-time
```

## 3. Screens

### 3.1 Role Selector (entry point)
- Four cards: Coordinator / Camp / Warehouse / Driver. Click → session starts as that role (Cognito group). No password flow needed for the demo.

### 3.2 Field Terminal (Camp / Warehouse / Driver view)
- Minimal form: submit stock update, request, dispatch, or route status, depending on role.
- **Network State Simulator** control (ONLINE / OFFLINE toggle) — visible here, since this is where the "field device" story lives.
- When OFFLINE: submissions visibly queue locally (a small counter: "3 events queued locally"), no network call is made, and this is a *real* IndexedDB write, not a fake state variable.
- When switched back ONLINE: a "Reconnecting…" animation plays, showing the queued events flushing to the API one by one or as a batch.

### 3.3 Command Center Dashboard (Coordinator view — this is the Best UI centerpiece)
- **Top bar:** SETU / Crisis Operations Center. Live sync status ("● NETWORK ONLINE — last synchronized Ns ago").
- **Main area — Network Graph** (replaces a literal geographic map): nodes for Warehouse and each Camp, edges showing shipments in flight. An edge pulses red when a CONFLICT is attached to it. Clicking a node/edge opens detail.
- **Left panel — Critical Shortages:** cards per camp showing survival window, population, severity (CRITICAL/HIGH/normal), sorted by urgency.
- **Right panel — Conflict Queue:** count and list of open sync conflicts, delivery discrepancies, duplicate requests. Clicking an item opens the Conflict Timeline (3.4).
- **Bottom — Live Event Stream:** scrolling, timestamped feed of raw events as they arrive (driver diverted, stock updated, request submitted, network restored, reconciliation started/finished).

### 3.4 Conflict Timeline (detail view, opened from the Conflict Queue)
- Vertical evidence trail: Warehouse → Driver → Camp → System, each with timestamp and claim.
- SETU's verdict rendered clearly at the bottom: e.g. "800L delivery = UNCONFIRMED. Keep Camp A shortage active." with the reasoning visible, not just the verdict.

### 3.5 Redistribution Panel
- Triggered when a new supply becomes available (manual "New Supply Arrived" input for the demo: item + quantity).
- Shows SETU's recommended allocation across camps with the raw numbers used (stock, population, survival window, confirmed vs. unconfirmed deliveries).
- **"Explain Decision" button** → calls Bedrock → renders the plain-language coordinator briefing underneath the numbers (never replacing them).

### 3.6 UI direction — Best UI target
- The visual direction is an **editorial operations console**: borrow the distinctive typography, warm/off-white surface, strong grid, oversized headlines, and restrained burnt-orange accent from the reference inspiration, while keeping the information hierarchy and operational clarity of a command center.
- Do **not** copy the reference artwork or layout literally. The product must remain unmistakably SETU.
- Primary dashboard hierarchy: **situation → critical shortages → conflicts → evidence → recommended action → live events**.
- Use near-black text for primary content, warm neutral surfaces, orange for brand/action emphasis, red only for active conflicts/critical states, and green only for confirmed/healthy states.
- Avoid generic purple-gradient AI styling, excessive glassmorphism, decorative charts, and animation without meaning.
- The core interaction must be understandable without a verbal explanation. Every major screen needs clear loading, success, empty, and error states.
- The desktop demo is the priority. Mobile responsiveness is secondary until the complete desktop flow works.

## 4. Non-functional requirements
- **Offline-first is real**, not simulated: IndexedDB persists queued events across a page reload; Service Worker handles background sync when connectivity returns, tested by actually disabling network in devtools, not just via the in-app toggle.
- **Editorial operations-console visual language**: distinctive typography and warm neutral surfaces, strong grid/hierarchy, high information density without clutter, restrained status color coding (red/amber/green), large critical numbers, and motion only for meaningful state changes.
- Responsiveness is secondary to desktop clarity — the demo is recorded on a laptop; don't spend build time on mobile breakpoints unless everything else is done.

## 5. Explicitly out of scope (see PROJECT.md §6)
No geographic map, no chatbot, no weather, no truck routing optimization, no donation/volunteer management, no full GIS, no real emergency system integrations.
