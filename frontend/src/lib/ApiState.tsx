'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  LocationProfile,
  InventoryState,
  Event,
  Conflict,
  Recommendation,
  FIXTURE_LOCATIONS,
  FIXTURE_INVENTORY_STATE,
} from '@setu/shared';
import { flushQueue } from './sync';

export type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'RECONCILED';

export interface Driver {
  id: string;
  name: string;
  vehicle: string;
  status: 'ASSIGNED' | 'LOADING' | 'DELAYED' | 'IN_TRANSIT' | 'DELIVERED';
  assignedRoute?: { from: string; to: string; };
  payload?: { item: string; quantity: number; };
  eta?: string;
}

export interface ApiStateContextType {
  locations: LocationProfile[];
  inventory: InventoryState[];
  drivers: Driver[];
  events: Event[];
  conflicts: Conflict[];
  recommendations: Recommendation[];
  offlineQueue: Event[];
  networkStatus: ConnectionStatus;
  
  setNetworkStatus: (status: ConnectionStatus) => void;
  addEvent: (event: Omit<Event, 'eventId' | 'timestamp' | 'syncStatus'>) => void;
  syncOfflineQueue: () => void;
  resolveConflict: (conflictId: string, resolution: string) => void;
  createSupplyRequest: (locationId: string, item: string, quantity: number) => void;
  getExplainedDecision: (recommendationId: string) => Promise<string | null>;
  toggleSimulateOffline: () => void;
}

const ApiContext = createContext<ApiStateContextType | null>(null);

const REST_URL = process.env.NEXT_PUBLIC_API_URL || 'https://e0rnisetl9.execute-api.ap-south-1.amazonaws.com';
const WS_URL = 'wss://uf2de7xmv9.execute-api.ap-south-1.amazonaws.com/prod';

export function ApiProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<LocationProfile[]>([
    ...FIXTURE_LOCATIONS,
    { locationId: 'WH-2', name: 'Warehouse Two', type: 'WAREHOUSE' }
  ]);
  
  const [inventory, setInventory] = useState<InventoryState[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<Event[]>([]);
  
  const [networkStatus, setNetworkStatus] = useState<ConnectionStatus>('ONLINE');
  const [simulateOffline, setSimulateOffline] = useState<boolean>(false);
  
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const wsRef = useRef<WebSocket | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${REST_URL}/state`);
      if (res.ok) {
        const data = await res.json();
        
        // Merge backend inventory with defaults (locations without dynamic state use defaults)
        const activeInventory = data.state || [];
        const mergedInventory = [...FIXTURE_INVENTORY_STATE, { locationId: 'WH-1', item: 'Water (L)', confirmedQuantity: 4000, unconfirmedQuantity: 0, lastVerifiedAt: new Date().toISOString() }, { locationId: 'WH-2', item: 'Water (L)', confirmedQuantity: 1000, unconfirmedQuantity: 0, lastVerifiedAt: new Date().toISOString() }]
          .map(defaultInv => {
            const backendInv = activeInventory.find((i: any) => i.locationId === defaultInv.locationId && i.item === defaultInv.item);
            return backendInv ? { ...defaultInv, ...backendInv } : defaultInv;
          });

        setInventory(mergedInventory);
        setConflicts(data.conflicts || []);
        setRecommendations(data.recommendations || []);
        
        if (data.events) {
          setEvents(prev => {
            // Keep local offline events that haven't synced yet
            const pendingLocal = prev.filter(e => e.syncStatus === 'PENDING');
            const backendEventIds = new Set(data.events.map((e: any) => e.eventId));
            const uniquePending = pendingLocal.filter(e => !backendEventIds.has(e.eventId));
            
            // Mark all backend events as SYNCED
            const syncedBackend = data.events.map((e: any) => ({ ...e, syncStatus: 'SYNCED' }));
            
            const merged = [...uniquePending, ...syncedBackend].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            localStorage.setItem('setu_events', JSON.stringify(merged));
            return merged;
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch state', e);
    }
  }, []);

  useEffect(() => {
    fetchState();

    // Load offline events and queued events
    const storedEvents = localStorage.getItem('setu_events');
    if (storedEvents) {
      try { setEvents(JSON.parse(storedEvents)); } catch (e) {}
    }
    
    // Setup WS
    const connectWs = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (data.type === 'RECONCILIATION_COMPLETE') {
            fetchState();
          }
        } catch (e) {}
      };
      ws.onclose = () => {
        setTimeout(connectWs, 3000);
      };
    };
    connectWs();

    const handleOnline = () => !simulateOffline && setNetworkStatus('ONLINE');
    const handleOffline = () => setNetworkStatus('OFFLINE');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const onQueueUpdate = async () => {
      const { getOfflineEvents } = await import('./db');
      const queued = await getOfflineEvents();
      setOfflineQueue(queued);
    };
    window.addEventListener('queue-updated', onQueueUpdate);
    onQueueUpdate();

    if (!navigator.onLine) setNetworkStatus('OFFLINE');

    return () => {
      wsRef.current?.close();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('queue-updated', onQueueUpdate);
    };
  }, [fetchState, simulateOffline]);

  useEffect(() => {
    if (simulateOffline) {
      setNetworkStatus('OFFLINE');
    } else if (navigator.onLine) {
      if (networkStatus === 'OFFLINE' && offlineQueue.length > 0) {
        syncOfflineQueue();
      } else {
        setNetworkStatus('ONLINE');
      }
    }
  }, [simulateOffline, offlineQueue.length]);

  const addEvent = async (eventData: Omit<Event, 'eventId' | 'timestamp' | 'syncStatus'>) => {
    const isOnline = (networkStatus === 'ONLINE' || networkStatus === 'RECONCILED') && !simulateOffline;
    const newEvent: Event = {
      ...eventData,
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      syncStatus: isOnline ? 'SYNCED' : 'PENDING'
    };

    setEvents(prev => {
      const updated = [newEvent, ...prev];
      localStorage.setItem('setu_events', JSON.stringify(updated));
      return updated;
    });

    if (!isOnline) {
      const { saveEventOffline } = await import('./db');
      await saveEventOffline(newEvent);
      window.dispatchEvent(new CustomEvent('queue-updated'));
    } else {
      try {
        const res = await fetch(`${REST_URL}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEvent)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Trigger reconciliation step function
        fetch(`${REST_URL}/sync`, { method: 'POST' }).catch(() => {});
      } catch (e) {
        console.error('Failed to send event online, queuing:', e);
        // Fallback to offline queue
        newEvent.syncStatus = 'PENDING';
        setEvents(prev => {
          const updated = prev.map(ev => ev.eventId === newEvent.eventId ? { ...ev, syncStatus: 'PENDING' as const } : ev);
          localStorage.setItem('setu_events', JSON.stringify(updated));
          return updated;
        });
        const { saveEventOffline } = await import('./db');
        await saveEventOffline(newEvent);
        window.dispatchEvent(new CustomEvent('queue-updated'));
      }
    }
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) {
      setNetworkStatus('ONLINE');
      return;
    }
    setNetworkStatus('SYNCING');
    
    await flushQueue();
    
    // Update local events state to SYNCED
    setEvents(prev => {
      const updated = prev.map(ev => 
        offlineQueue.find(q => q.eventId === ev.eventId) ? { ...ev, syncStatus: 'SYNCED' as const } : ev
      );
      localStorage.setItem('setu_events', JSON.stringify(updated));
      return updated;
    });
    
    window.dispatchEvent(new CustomEvent('queue-updated'));
    setNetworkStatus('RECONCILED');
    
    // Trigger backend step functions after flush
    try {
      await fetch(`${REST_URL}/sync`, { method: 'POST' });
    } catch (e) {}

    setTimeout(() => setNetworkStatus('ONLINE'), 2500);
  };

  const resolveConflict = (conflictId: string, resolution: string) => {
    // Optimistically remove conflict locally, since there's no backend endpoint to resolve it right now
    setConflicts(prev => prev.filter(c => c.conflictId !== conflictId));
  };

  const createSupplyRequest = (locationId: string, item: string, quantity: number) => {
    addEvent({
      deviceId: 'field-terminal',
      actorId: 'FieldOperator',
      locationId,
      eventType: 'REQUEST_SUBMITTED',
      payload: { item, quantity }
    });
  };

  const getExplainedDecision = async (recommendationId: string) => {
    try {
      const res = await fetch(`${REST_URL}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId })
      });
      if (res.ok) {
        const data = await res.json();
        return data.explanation ?? null;
      }
      console.error('Explain endpoint returned', res.status);
    } catch (e) {
      console.error('Explanation failed', e);
    }
    return null;
  };

  const toggleSimulateOffline = () => setSimulateOffline(prev => !prev);

  return (
    <ApiContext.Provider value={{
      locations,
      inventory,
      drivers,
      events,
      conflicts,
      recommendations,
      offlineQueue,
      networkStatus,
      setNetworkStatus,
      addEvent,
      syncOfflineQueue,
      resolveConflict,
      createSupplyRequest,
      getExplainedDecision,
      toggleSimulateOffline
    }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApiState() {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApiState must be used within an ApiProvider');
  }
  return context;
}
