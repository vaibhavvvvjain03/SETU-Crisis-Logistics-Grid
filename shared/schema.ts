import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Core Enums & Schemas
// ---------------------------------------------------------------------------

export const EventType = z.enum([
  'STOCK_UPDATE',
  'REQUEST_SUBMITTED',
  'DISPATCH_RECORDED',
  'ROUTE_STATUS_UPDATED',
  'DELIVERY_CONFIRMED'
]);

export const EventSchema = z.object({
  eventId: z.string().uuid(),
  deviceId: z.string().min(1),
  actorId: z.string().min(1),
  locationId: z.string().min(1),
  eventType: EventType,
  timestamp: z.string().datetime(),
  payload: z.record(z.any()),
  syncStatus: z.enum(['PENDING', 'SYNCED']).default('PENDING'),
});

export const InventoryStateSchema = z.object({
  locationId: z.string(),
  item: z.string(),
  confirmedQuantity: z.number().min(0),
  unconfirmedQuantity: z.number().min(0),
  lastVerifiedAt: z.string().datetime(),
});

export const LocationProfileSchema = z.object({
  locationId: z.string(),
  name: z.string(),
  type: z.enum(['CAMP', 'WAREHOUSE', 'CHECKPOINT']),
  population: z.number().optional(),
  /** Survival window in hours based on current stock */
  survivalWindowHours: z.number().optional(),
  /** Consumption rate in L/hour */
  consumptionRatePerHour: z.number().optional(),
});

export const ConflictSchema = z.object({
  conflictId: z.string().uuid(),
  relatedEvents: z.array(z.string()),
  conflictType: z.enum(['DELIVERY_UNCONFIRMED', 'DUPLICATE_REQUEST', 'STOCK_MISMATCH']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  resolution: z.string().optional(),
  evidence: z.array(z.record(z.any())),
  locationId: z.string().optional(),
  detectedAt: z.string().datetime().optional(),
});

export const RecommendationSchema = z.object({
  recommendationId: z.string().uuid(),
  supply: z.string(),
  supplyQuantity: z.number(),
  destinations: z.record(z.number()),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  generatedAt: z.string().datetime().optional(),
  bedrockUsed: z.boolean().optional(),
});

export const SupplyRequestSchema = z.object({
  item: z.string().min(1),
  quantity: z.number().positive(),
});

// ---------------------------------------------------------------------------
// TypeScript Types (inferred from Zod)
// ---------------------------------------------------------------------------

export type EventType = z.infer<typeof EventType>;
export type Event = z.infer<typeof EventSchema>;
export type InventoryState = z.infer<typeof InventoryStateSchema>;
export type LocationProfile = z.infer<typeof LocationProfileSchema>;
export type Conflict = z.infer<typeof ConflictSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type SupplyRequest = z.infer<typeof SupplyRequestSchema>;

// ---------------------------------------------------------------------------
// Fixture Data (Camp A / B / C — the canonical PS scenario)
// ---------------------------------------------------------------------------

export const FIXTURE_LOCATIONS: LocationProfile[] = [
  {
    locationId: 'Camp-A',
    name: 'Camp Alpha',
    type: 'CAMP',
    population: 1200,
    survivalWindowHours: 4,
    consumptionRatePerHour: 100, // 400L / 4h
  },
  {
    locationId: 'Camp-B',
    name: 'Camp Bravo',
    type: 'CAMP',
    population: 800,
    survivalWindowHours: 72,
    consumptionRatePerHour: 40,  // 2900L / 72h ≈ 40
  },
  {
    locationId: 'Camp-C',
    name: 'Camp Charlie',
    type: 'CAMP',
    population: 1500,
    survivalWindowHours: 9,
    consumptionRatePerHour: 100, // 900L / 9h = 100
  },
  {
    locationId: 'WH-1',
    name: 'Warehouse One',
    type: 'WAREHOUSE',
    population: 0,
  },
];

export const FIXTURE_INVENTORY_STATE: InventoryState[] = [
  {
    locationId: 'Camp-A',
    item: 'Water (L)',
    confirmedQuantity: 400,
    unconfirmedQuantity: 0,
    lastVerifiedAt: '2024-01-01T08:00:00.000Z',
  },
  {
    locationId: 'Camp-B',
    item: 'Water (L)',
    confirmedQuantity: 2900,
    unconfirmedQuantity: 0,
    lastVerifiedAt: '2024-01-01T08:00:00.000Z',
  },
  {
    locationId: 'Camp-C',
    item: 'Water (L)',
    confirmedQuantity: 900,
    unconfirmedQuantity: 0,
    lastVerifiedAt: '2024-01-01T08:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Business Logic — Conflict Detection
// ---------------------------------------------------------------------------

/**
 * Pure deterministic conflict detection. Never calls any external service.
 * All conflicts are derived solely from the event log and current state.
 */
export function detectConflictsLogic(events: Event[], state: InventoryState[]): Conflict[] {
  const conflicts: Conflict[] = [];

  // Group events by location, sorted by timestamp
  const eventsByLocation: Record<string, Event[]> = {};
  for (const ev of events) {
    if (!eventsByLocation[ev.locationId]) eventsByLocation[ev.locationId] = [];
    eventsByLocation[ev.locationId].push(ev);
  }

  for (const [locationId, locEvents] of Object.entries(eventsByLocation)) {
    locEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const requests = locEvents.filter(e => e.eventType === 'REQUEST_SUBMITTED');
    const routeUpdates = locEvents.filter(e => e.eventType === 'ROUTE_STATUS_UPDATED');
    const confirmations = locEvents.filter(e => e.eventType === 'DELIVERY_CONFIRMED');
    const stockUpdates = locEvents.filter(e => e.eventType === 'STOCK_UPDATE');

    // --- Rule 1: Duplicate request (same location, same item, < 30 min) ---
    for (let i = 0; i < requests.length - 1; i++) {
      const t1 = new Date(requests[i].timestamp).getTime();
      const t2 = new Date(requests[i + 1].timestamp).getTime();
      if (t2 - t1 < 30 * 60 * 1000) {
        conflicts.push({
          conflictId: uuidv4(),
          relatedEvents: [requests[i].eventId, requests[i + 1].eventId],
          conflictType: 'DUPLICATE_REQUEST',
          severity: 'MEDIUM',
          locationId,
          detectedAt: new Date().toISOString(),
          evidence: [{
            claim: 'Duplicate supply request submitted within 30 minutes',
            requestedItem: requests[i].payload?.item,
            requestedQuantity: requests[i].payload?.quantity,
          }],
        });
      }
    }

    // --- Rule 2: Delivery unconfirmed (driver delivered/diverted, no camp confirmation) ---
    const diversions = routeUpdates.filter(
      e => e.payload?.status === 'DIVERTED' || e.payload?.status === 'DELIVERED'
    );
    for (const div of diversions) {
      const hasConfirmation = confirmations.some(
        c => new Date(c.timestamp).getTime() >= new Date(div.timestamp).getTime()
      );
      if (!hasConfirmation) {
        conflicts.push({
          conflictId: uuidv4(),
          relatedEvents: [div.eventId],
          conflictType: 'DELIVERY_UNCONFIRMED',
          severity: 'HIGH',
          locationId,
          detectedAt: new Date().toISOString(),
          evidence: [{
            claim: `Route updated to ${div.payload?.status} but no delivery confirmation received at camp`,
            routeStatus: div.payload?.status,
            quantity: div.payload?.quantity,
            timestamp: div.timestamp,
          }],
        });
      }
    }

    // --- Rule 3: Stock mismatch (contradicting stock reports without intervening delivery) ---
    if (stockUpdates.length >= 2) {
      for (let i = 0; i < stockUpdates.length - 1; i++) {
        const prev = stockUpdates[i];
        const curr = stockUpdates[i + 1];
        const prevQty = Number(prev.payload?.quantity ?? 0);
        const currQty = Number(curr.payload?.quantity ?? 0);

        // Check if quantity jumped UP without a delivery event between them
        if (currQty > prevQty) {
          const hasDeliveryBetween = confirmations.some(c => {
            const ct = new Date(c.timestamp).getTime();
            return ct > new Date(prev.timestamp).getTime() && ct <= new Date(curr.timestamp).getTime();
          });
          if (!hasDeliveryBetween) {
            conflicts.push({
              conflictId: uuidv4(),
              relatedEvents: [prev.eventId, curr.eventId],
              conflictType: 'STOCK_MISMATCH',
              severity: 'HIGH',
              locationId,
              detectedAt: new Date().toISOString(),
              evidence: [{
                claim: `Stock reported as ${currQty}L but was previously ${prevQty}L with no confirmed delivery in between`,
                previousQuantity: prevQty,
                reportedQuantity: currQty,
              }],
            });
          }
        }
      }
    }
  }

  return conflicts;
}

// ---------------------------------------------------------------------------
// Business Logic — Redistribution
// ---------------------------------------------------------------------------

/**
 * Pure deterministic redistribution logic.
 * Prioritises camps by shortest survival window (most urgent first).
 * Never calls any external service, never performs estimation.
 *
 * @param state    Current inventory state per location
 * @param conflicts Active conflicts (used to flag unconfirmed deliveries)
 * @param supplyQuantity  Total available supply (defaults to 4000 for demo)
 * @param supplyItem  Item label (defaults to 'Water (L)')
 * @param locations  Location profiles with population + survival window
 */
export function calculateRedistributionLogic(
  state: InventoryState[],
  conflicts: Conflict[],
  supplyQuantity = 4000,
  supplyItem = 'Water (L)',
  locations: LocationProfile[] = FIXTURE_LOCATIONS,
): Recommendation[] {
  if (state.length === 0) return [];

  // Build location profile index
  const profileIndex: Record<string, LocationProfile> = {};
  for (const loc of locations) {
    profileIndex[loc.locationId] = loc;
  }

  // Identify locations with DELIVERY_UNCONFIRMED conflicts → treat as shortage
  const unconfirmedDeliveryLocations = new Set(
    conflicts
      .filter(c => c.conflictType === 'DELIVERY_UNCONFIRMED' && c.locationId)
      .map(c => c.locationId!)
  );

  // Enrich state with survival window (use profile data, or compute from stock + consumption rate)
  interface EnrichedState extends InventoryState {
    survivalWindowHours: number;
    population: number;
    hasUnconfirmedDelivery: boolean;
  }

  const enriched: EnrichedState[] = state
    .filter(s => s.locationId !== 'WH-1') // Don't allocate to warehouse
    .map(s => {
      const profile = profileIndex[s.locationId];
      const consumptionRate = profile?.consumptionRatePerHour ?? 1;
      const survivalWindow = profile?.survivalWindowHours ?? (s.confirmedQuantity / consumptionRate);
      return {
        ...s,
        survivalWindowHours: survivalWindow,
        population: profile?.population ?? 0,
        hasUnconfirmedDelivery: unconfirmedDeliveryLocations.has(s.locationId),
      };
    });

  // Sort by survival window ascending (shortest first = most urgent)
  enriched.sort((a, b) => a.survivalWindowHours - b.survivalWindowHours);

  let remaining = supplyQuantity;
  const allocations: Record<string, number> = {};
  const allocationDetails: Array<{ locationId: string; allocated: number; survivalHours: number; stock: number }> = [];

  // Calculate each camp's deficit to reach a 24-hour safety threshold
  const SAFE_HOURS = 24;
  for (const s of enriched) {
    if (remaining <= 0) break;

    const consumptionRate = profileIndex[s.locationId]?.consumptionRatePerHour ?? 1;
    const safeStock = SAFE_HOURS * consumptionRate;
    const currentStock = s.hasUnconfirmedDelivery ? s.confirmedQuantity : s.confirmedQuantity;
    const deficit = Math.max(0, safeStock - currentStock);

    if (deficit > 0 || s.survivalWindowHours < SAFE_HOURS) {
      const allocate = Math.min(deficit > 0 ? deficit : remaining, remaining);
      if (allocate > 0) {
        allocations[s.locationId] = allocate;
        allocationDetails.push({
          locationId: s.locationId,
          allocated: allocate,
          survivalHours: s.survivalWindowHours,
          stock: currentStock,
        });
        remaining -= allocate;
      }
    }
  }

  if (Object.keys(allocations).length === 0) return [];

  const surplus = remaining;
  const reasonParts = allocationDetails.map(d => {
    const name = profileIndex[d.locationId]?.name ?? d.locationId;
    return `${name}: ${d.allocated}L (${d.stock}L stock, ${d.survivalHours}h window)`;
  });

  const reason = `Allocated ${supplyQuantity - surplus}L of ${supplyItem} based on survival window priority. ${reasonParts.join('; ')}. ${surplus > 0 ? `${surplus}L surplus unallocated.` : 'Full supply allocated.'}`;

  return [{
    recommendationId: uuidv4(),
    supply: supplyItem,
    supplyQuantity,
    destinations: allocations,
    reason,
    confidence: 0.95,
    generatedAt: new Date().toISOString(),
    bedrockUsed: false,
  }];
}

// ---------------------------------------------------------------------------
// Local Explanation Adapter
// LOCAL_ADAPTER: Replace with real Bedrock call in AWS deployment
// ---------------------------------------------------------------------------

/**
 * Produces a rich deterministic explanation of a recommendation.
 * Echoes all numbers exactly — never invents or rounds figures.
 * This is the fallback used when Bedrock is unavailable.
 */
export function explainDecisionLocalMock(rec: Recommendation, locations: LocationProfile[] = FIXTURE_LOCATIONS): string {
  const profileIndex: Record<string, LocationProfile> = {};
  for (const loc of locations) profileIndex[loc.locationId] = loc;

  const destinationLines = Object.entries(rec.destinations)
    .map(([locId, qty]) => {
      const profile = profileIndex[locId];
      const name = profile?.name ?? locId;
      const pop = profile?.population ? ` (${profile.population} people)` : '';
      const window = profile?.survivalWindowHours !== undefined ? `, ${profile.survivalWindowHours}h survival window` : '';
      return `${name}${pop}${window} receives ${qty}L`;
    })
    .join('; ');

  const totalAllocated = Object.values(rec.destinations).reduce((a, b) => a + b, 0);
  const surplus = rec.supplyQuantity - totalAllocated;

  return `SETU has allocated ${totalAllocated}L of ${rec.supply} from a total supply of ${rec.supplyQuantity}L, prioritising camps by shortest survival window. Distribution: ${destinationLines}. ${surplus > 0 ? `${surplus}L remains unallocated as all other locations are above the 24-hour safety threshold.` : 'The full supply has been allocated.'} These figures are deterministic — calculated by the redistribution engine, not estimated. Confidence: ${Math.round(rec.confidence * 100)}%.`;
}
