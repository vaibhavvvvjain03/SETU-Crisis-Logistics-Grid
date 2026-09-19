import { getOfflineEvents, deleteOfflineEvent } from './db';
import { Event } from '@setu/shared';

// Use an environment variable for the API URL, falling back to a local route for dev
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/events';

export async function flushQueue() {
  const events = await getOfflineEvents();
  if (events.length === 0) return;

  console.log(`Attempting to flush ${events.length} queued events...`);

  // We can send them one by one or in a batch.
  // The API contract currently expects a single event or array. Let's send an array if the backend supports it,
  // or individually for simplicity. We'll send them individually to ensure granular retry.
  
  for (const event of events) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        console.log(`Successfully synced event: ${event.eventId}`);
        await deleteOfflineEvent(event.eventId);
      } else {
        console.error(`Failed to sync event ${event.eventId}: ${response.statusText}`);
        // Stop flushing on first error to maintain order, or continue?
        // Usually better to stop and let the next sync handle it to prevent out-of-order issues.
        break;
      }
    } catch (error) {
      console.error(`Network error while syncing event ${event.eventId}`, error);
      break; // Network down again, stop flushing
    }
  }

  // Dispatch an event to update the UI queue count
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('queue-updated'));
  }
}
