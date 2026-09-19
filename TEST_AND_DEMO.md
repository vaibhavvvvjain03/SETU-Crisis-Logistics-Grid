# TEST_AND_DEMO.md — SETU

## 1. Core logic test cases (run against fixture data before trusting real UI)

### Conflict detection (`detectConflicts`)
1. **Unconfirmed delivery:** Warehouse dispatches 800L → Driver reports diversion → Camp reports no delivery. Expect: one CONFLICT, type `DELIVERY_UNCONFIRMED`, evidence chain includes all three events in timestamp order.
2. **Confirmed delivery, no conflict:** Warehouse dispatches → Driver reports arrival → Camp confirms receipt matching quantity. Expect: zero conflicts, INVENTORY_STATE updated to confirmed.
3. **Duplicate request:** Same location submits the same item/quantity request twice within a short window (e.g. under 30 min, before any response). Expect: one CONFLICT, type `DUPLICATE_REQUEST`, both REQUEST records linked.
4. **Stock mismatch:** Camp reports 400L remaining; a later, contradicting camp report (same location, no intervening delivery event) reports 900L. Expect: CONFLICT, type `STOCK_MISMATCH`.
5. **Stale data ignored correctly:** An event arrives with a timestamp older than the last reconciled state for that location and doesn't contradict it. Expect: no false conflict — it's just old, not contradictory.

### Redistribution (`calculateRedistribution`)
6. **Worked example from the PS:** Camp A (400L, 4h window, 1200 people), Camp B (2900L, 3-day window, 800 people), Camp C (900L, 9h window, 1500 people), incoming 4000L. Expect allocation prioritizing shortest survival window first: Camp A and Camp C receive supply, Camp B receives none or minimal, matching the PS's worked example (2800L → A, 1200L → C).
7. **Supply exceeds total need:** Incoming supply larger than all camps' combined shortfall. Expect no over-allocation past each camp's actual need; note surplus explicitly rather than dumping it arbitrarily.
8. **Single camp critical, others fine:** Only one camp below a safe threshold. Expect full allocation to that camp, explanation notes why others received nothing.

### Offline layer
9. **Real network kill:** Disable network in browser devtools (not the in-app toggle), submit 3 events, confirm they appear in IndexedDB and are NOT sent to the API. Re-enable network, confirm Service Worker background sync fires and all 3 arrive at `/events` in original order.
10. **Page reload while offline:** Queue events, reload the page while still offline, confirm queued events persist in IndexedDB and are not lost.

### Bedrock explanation
11. **Number fidelity:** For 3 different RECOMMENDATION/CONFLICT inputs, confirm every number in Bedrock's output text matches the input exactly (no rounding, no recalculation, no invented figures).
12. **Bedrock failure fallback:** Simulate a Bedrock timeout/error. Confirm the Command Center still displays the full deterministic recommendation with an "explanation unavailable" note, and nothing else breaks.

## 2. End-to-end smoke test (run before recording the demo)
Fresh browser, cleared storage → Role Selector → switch a Field Terminal to OFFLINE → submit 3-4 events across roles (stock update, dispatch, diversion) → switch back ONLINE → confirm reconnect animation plays → confirm Command Center shows the correct conflict(s) → open Conflict Timeline, confirm evidence trail is accurate → submit new incoming supply → confirm recommendation appears → click Explain Decision → confirm Bedrock briefing matches the numbers shown.

## 3. Demo video script (3 minutes, recorded, no live demo — this is what judges see)

**0:00** — "During disasters, losing connectivity doesn't stop relief operations. It fragments reality."

**0:10** — Show Command Center, calm/normal state.

**0:20** — Switch Network State Simulator to OFFLINE. "Three camps are now offline."

**0:30** — Cut to Field Terminal(s), submit events while offline — show the local queue counter incrementing. This is real IndexedDB, not simulated — worth saying explicitly on camera since it's a differentiator.

**0:45** — Show the actual queue count from the run; never use a fabricated number.

**0:55** — Switch back ONLINE. "SETU doesn't simply sync the newest data."

**1:05** — Show reconnect animation, then "3 conflicts detected."

**1:15** — Open the delivery conflict in the Conflict Timeline.

**1:25** — Walk the evidence trail: warehouse dispatched, driver diverted, camp never received.

**1:35** — Show SETU's verdict: "DELIVERY UNCONFIRMED — shortage stays active."

**1:45** — Cut to the SETU Command Center: critical shortages, conflict queue and the affected network edge. Use the red state only for the active conflict.

**1:55** — Trigger new incoming supply (4000L).

**2:05** — Show the recommended allocation with the real numbers (stock, population, survival window) in the primary decision panel.

**2:15** — Click "Explain Decision" — Bedrock's plain-language briefing appears.

**2:30** — Quick architecture callout: "Every number here is deterministic — Lambda and Step Functions. Bedrock only explains it. That split matters because in a crisis, an AI shouldn't be the one doing the arithmetic."

**2:45** — Close: "SETU doesn't just tell responders what data exists. It helps determine which version of reality can be trusted before the next scarce supply is dispatched."

## 4. Judge Q&A prep (memorize, don't read off-script)
**Q: "Isn't this already solved by disaster-management platforms?"**
A: "Yes, parts of it are. Sahana already handles humanitarian logistics and inventory, and Kobo supports offline field data collection. SETU is intentionally narrower. Our problem starts when disconnected systems reconnect — different actors can report different versions of the same event. SETU treats those updates as an event history, identifies contradictions, establishes what's actually confirmed, and uses that reconciled state to support scarce-supply redistribution. We're not building another disaster dashboard. We're building the reconciliation layer between fragmented field realities."
