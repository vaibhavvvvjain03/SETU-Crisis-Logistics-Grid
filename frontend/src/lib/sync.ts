import { getOfflineEvents, deleteOfflineEvent } from './db';
import { Event } from '@setu/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://e0rnisetl9.execute-api.ap-south-1.amazonaws.com/events';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function flushQueue() {
  const events = await getOfflineEvents();
  if (events.length === 0) return;

  console.log(`Attempting to flush ${events.length} queued events with exponential backoff...`);

  for (const event of events) {
    let success = false;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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
          success = true;
          break; // Move to next event
        } else if (response.status >= 500) {
          console.warn(`Server error (5xx) for event ${event.eventId}. Attempt ${attempt}/${MAX_RETRIES}`);
        } else if (response.status >= 400 && response.status < 500) {
          console.error(`Client error (4xx) for event ${event.eventId}. Skipping. It is malformed.`);
          // Remove malformed event from queue to prevent poison pill blocking the whole queue
          await deleteOfflineEvent(event.eventId);
          success = true;
          break;
        }
      } catch (error) {
        console.warn(`Network error for event ${event.eventId}. Attempt ${attempt}/${MAX_RETRIES}`);
      }

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await wait(delay);
      }
    }

    if (!success) {
      console.error(`Failed to sync event ${event.eventId} after ${MAX_RETRIES} attempts. Stopping queue flush to maintain order.`);
      break; 
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('queue-updated'));
  }
}
