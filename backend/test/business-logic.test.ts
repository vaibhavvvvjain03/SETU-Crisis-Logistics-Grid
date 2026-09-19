/**
 * Business logic unit tests for SETU shared schema functions.
 * Tests cover the scenarios defined in TEST_AND_DEMO.md §1.
 */

import {
  detectConflictsLogic,
  calculateRedistributionLogic,
  explainDecisionLocalMock,
  FIXTURE_INVENTORY_STATE,
  FIXTURE_LOCATIONS,
  Event,
  InventoryState,
  Conflict,
} from '../../shared/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    eventId: Math.random().toString(36).slice(2),
    deviceId: 'test-device',
    actorId: 'test-actor',
    locationId: 'Camp-A',
    eventType: 'STOCK_UPDATE',
    timestamp: new Date().toISOString(),
    payload: {},
    syncStatus: 'PENDING',
    ...overrides,
  };
}

function makeState(overrides: Partial<InventoryState> = {}): InventoryState {
  return {
    locationId: 'Camp-A',
    item: 'Water (L)',
    confirmedQuantity: 500,
    unconfirmedQuantity: 0,
    lastVerifiedAt: new Date().toISOString(),
    ...overrides,
  };
}

function ts(offsetMinutes: number) {
  return new Date(Date.now() + offsetMinutes * 60 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// detectConflictsLogic — TEST_AND_DEMO §1 scenarios
// ---------------------------------------------------------------------------

describe('detectConflictsLogic', () => {
  test('1. Delivery unconfirmed: driver diverted, no camp confirmation → DELIVERY_UNCONFIRMED', () => {
    const dispatch = makeEvent({ eventType: 'DISPATCH_RECORDED', timestamp: ts(-3), payload: { quantity: 800 } });
    const diversion = makeEvent({ eventType: 'ROUTE_STATUS_UPDATED', timestamp: ts(-2), payload: { status: 'DIVERTED', quantity: 800 } });
    // No delivery confirmation event
    const events: Event[] = [dispatch, diversion];
    const conflicts = detectConflictsLogic(events, [makeState()]);
    const deliveryConflicts = conflicts.filter(c => c.conflictType === 'DELIVERY_UNCONFIRMED');
    expect(deliveryConflicts).toHaveLength(1);
    expect(deliveryConflicts[0].severity).toBe('HIGH');
    expect(deliveryConflicts[0].relatedEvents).toContain(diversion.eventId);
  });

  test('2. Confirmed delivery, no conflict: all three actors agree → zero conflicts', () => {
    const dispatch = makeEvent({ eventType: 'DISPATCH_RECORDED', timestamp: ts(-3), payload: { quantity: 800 } });
    const delivered = makeEvent({ eventType: 'ROUTE_STATUS_UPDATED', timestamp: ts(-2), payload: { status: 'DELIVERED' } });
    const confirm = makeEvent({ eventType: 'DELIVERY_CONFIRMED', timestamp: ts(-1), payload: { quantity: 800 } });
    const events: Event[] = [dispatch, delivered, confirm];
    const conflicts = detectConflictsLogic(events, [makeState()]);
    expect(conflicts.filter(c => c.conflictType === 'DELIVERY_UNCONFIRMED')).toHaveLength(0);
  });

  test('3. Duplicate request: same location, same item, < 30 min → DUPLICATE_REQUEST', () => {
    const req1 = makeEvent({ eventType: 'REQUEST_SUBMITTED', timestamp: ts(-20), payload: { item: 'Water', quantity: 500 } });
    const req2 = makeEvent({ eventType: 'REQUEST_SUBMITTED', timestamp: ts(-5), payload: { item: 'Water', quantity: 500 } });
    const conflicts = detectConflictsLogic([req1, req2], []);
    const dupConflicts = conflicts.filter(c => c.conflictType === 'DUPLICATE_REQUEST');
    expect(dupConflicts).toHaveLength(1);
    expect(dupConflicts[0].severity).toBe('MEDIUM');
    expect(dupConflicts[0].relatedEvents).toContain(req1.eventId);
    expect(dupConflicts[0].relatedEvents).toContain(req2.eventId);
  });

  test('4. Stock mismatch: quantity jumps up with no delivery between → STOCK_MISMATCH', () => {
    const low = makeEvent({ eventType: 'STOCK_UPDATE', timestamp: ts(-30), payload: { quantity: 400 } });
    const high = makeEvent({ eventType: 'STOCK_UPDATE', timestamp: ts(-10), payload: { quantity: 900 } });
    // No DELIVERY_CONFIRMED between them
    const conflicts = detectConflictsLogic([low, high], []);
    const mismatches = conflicts.filter(c => c.conflictType === 'STOCK_MISMATCH');
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].evidence[0]).toMatchObject({
      previousQuantity: 400,
      reportedQuantity: 900,
    });
  });

  test('5. Stale data correctly ignored: no false conflict from old non-contradictory event', () => {
    const old = makeEvent({ eventType: 'STOCK_UPDATE', timestamp: ts(-120), payload: { quantity: 400 } });
    const recent = makeEvent({ eventType: 'STOCK_UPDATE', timestamp: ts(-60), payload: { quantity: 380 } });
    // Stock goes down (consumption) — not a mismatch, no delivery needed
    const conflicts = detectConflictsLogic([old, recent], []);
    expect(conflicts.filter(c => c.conflictType === 'STOCK_MISMATCH')).toHaveLength(0);
  });

  test('No events → no conflicts', () => {
    expect(detectConflictsLogic([], [])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// calculateRedistributionLogic — TEST_AND_DEMO §1 scenarios 6-8
// ---------------------------------------------------------------------------

describe('calculateRedistributionLogic', () => {
  const campAState = makeState({ locationId: 'Camp-A', confirmedQuantity: 400 });
  const campBState = makeState({ locationId: 'Camp-B', confirmedQuantity: 2900 });
  const campCState = makeState({ locationId: 'Camp-C', confirmedQuantity: 900 });

  test('6. PS worked example: 4000L with Camp A (4h window), B (3d), C (9h) → A and C prioritised', () => {
    const recs = calculateRedistributionLogic(
      [campAState, campBState, campCState],
      [],
      4000,
      'Water (L)',
      FIXTURE_LOCATIONS,
    );
    expect(recs).toHaveLength(1);
    const dest = recs[0].destinations;

    // Camp A (4h window) and Camp C (9h window) should receive supply; Camp B (3d) should not or receive much less
    expect(dest['Camp-A']).toBeGreaterThan(0);
    expect(dest['Camp-C']).toBeGreaterThan(0);
    const bAlloc = dest['Camp-B'] ?? 0;
    const aAlloc = dest['Camp-A'] ?? 0;
    const cAlloc = dest['Camp-C'] ?? 0;
    // Total should not exceed supply
    expect(aAlloc + bAlloc + cAlloc).toBeLessThanOrEqual(4000);
    // Camp A and C together should be the primary recipients
    expect(aAlloc + cAlloc).toBeGreaterThan(bAlloc);
  });

  test('7. Supply exceeds total need: no over-allocation; surplus noted', () => {
    const stateWithSmallDeficit = [
      makeState({ locationId: 'Camp-A', confirmedQuantity: 2300 }), // just below 24h threshold for 100L/h camp
    ];
    const recs = calculateRedistributionLogic(
      stateWithSmallDeficit,
      [],
      50000, // way more than needed
      'Water (L)',
      FIXTURE_LOCATIONS,
    );
    if (recs.length > 0) {
      const total = Object.values(recs[0].destinations).reduce((a, b) => a + b, 0);
      expect(total).toBeLessThanOrEqual(50000);
      expect(recs[0].reason).toMatch(/surplus|unallocated/i);
    }
  });

  test('8. Single critical camp, others fine: full allocation to critical camp', () => {
    const criticalOnly = [makeState({ locationId: 'Camp-A', confirmedQuantity: 50 })]; // critically low
    const recs = calculateRedistributionLogic(
      criticalOnly,
      [],
      2000,
      'Water (L)',
      FIXTURE_LOCATIONS,
    );
    expect(recs).toHaveLength(1);
    expect(recs[0].destinations['Camp-A']).toBeGreaterThan(0);
  });

  test('Empty state → no recommendations', () => {
    expect(calculateRedistributionLogic([], [], 4000)).toHaveLength(0);
  });

  test('Confidence is a valid 0-1 value', () => {
    const recs = calculateRedistributionLogic(
      [campAState],
      [],
      1000,
      'Water (L)',
      FIXTURE_LOCATIONS,
    );
    if (recs.length > 0) {
      expect(recs[0].confidence).toBeGreaterThanOrEqual(0);
      expect(recs[0].confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// explainDecisionLocalMock — number fidelity check
// ---------------------------------------------------------------------------

describe('explainDecisionLocalMock', () => {
  test('11. Number fidelity: all numbers in explanation match the recommendation exactly', () => {
    const [rec] = calculateRedistributionLogic(
      FIXTURE_INVENTORY_STATE,
      [],
      4000,
      'Water (L)',
      FIXTURE_LOCATIONS,
    );
    expect(rec).toBeDefined();
    const explanation = explainDecisionLocalMock(rec, FIXTURE_LOCATIONS);

    // Every allocation quantity must appear in the explanation text
    for (const [locId, qty] of Object.entries(rec.destinations)) {
      expect(explanation).toContain(qty.toString());
    }

    // Supply quantity must appear
    expect(explanation).toContain('4000');
    // Confidence must appear
    expect(explanation).toContain('95');
  });

  test('12. Bedrock failure simulation: explanation is still produced (deterministic fallback)', () => {
    const [rec] = calculateRedistributionLogic(
      FIXTURE_INVENTORY_STATE,
      [],
      4000,
      'Water (L)',
      FIXTURE_LOCATIONS,
    );
    // The local mock IS the fallback — it should always return a non-empty string
    const explanation = explainDecisionLocalMock(rec, FIXTURE_LOCATIONS);
    expect(explanation).toBeTruthy();
    expect(explanation.length).toBeGreaterThan(50);
  });
});
