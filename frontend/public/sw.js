self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for the background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-events') {
    event.waitUntil(flushEvents());
  }
});

// Since the service worker runs in its own context, we can't easily import our lib/db.ts.
// We must write standard IndexedDB code here.
async function flushEvents() {
  const db = await openDB();
  const tx = db.transaction('events', 'readonly');
  const store = tx.objectStore('events');
  const events = await store.getAll();

  if (!events || events.length === 0) return;

  for (const event of events) {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
      
      if (response.ok) {
        await deleteEvent(event.eventId);
      }
    } catch (err) {
      console.error('SW Sync Failed:', err);
      // throw to signal failure so the browser will retry later
      throw err;
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('setu-offline-db', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    // Note: onupgradeneeded isn't needed here as the DB is created by the main thread
  });
}

async function deleteEvent(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
