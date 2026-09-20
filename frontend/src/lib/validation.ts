import { z } from 'zod';
import { EventSchema, SupplyRequestSchema, Event } from '@setu/shared';

/**
 * Validates an event payload before adding it to the offline queue.
 * Ensures that corrupted data is never queued or synced.
 */
export function validateEvent(event: any): { success: true; data: Event } | { success: false; error: string } {
  const result = EventSchema.safeParse(event);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
  }
}

/**
 * Validates a supply request payload.
 */
export function validateSupplyRequest(payload: any): { success: true; data: { item: string; quantity: number } } | { success: false; error: string } {
  const result = SupplyRequestSchema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
  }
}
