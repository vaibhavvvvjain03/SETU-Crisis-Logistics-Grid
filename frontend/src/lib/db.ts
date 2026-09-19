import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Event } from '@setu/shared';

interface SetuDB extends DBSchema {
  events: {
    key: string;
    value: Event;
    indexes: { 'by-timestamp': string };
  };
}

let dbPromise: Promise<IDBPDatabase<SetuDB>> | null = null;

if (typeof window !== 'undefined') {
  dbPromise = openDB<SetuDB>('setu-offline-db', 1, {
    upgrade(db) {
      const store = db.createObjectStore('events', {
        keyPath: 'eventId',
      });
      store.createIndex('by-timestamp', 'timestamp');
    },
  });
}

export async function saveEventOffline(event: Event) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.put('events', event);
}

export async function getOfflineEvents(): Promise<Event[]> {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return await db.getAllFromIndex('events', 'by-timestamp');
}

export async function deleteOfflineEvent(eventId: string) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.delete('events', eventId);
}
