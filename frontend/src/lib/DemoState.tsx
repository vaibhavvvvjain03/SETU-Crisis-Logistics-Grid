'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  LocationProfile,
  InventoryState,
  Event,
  Conflict,
  Recommendation,
  SupplyRequest,
  FIXTURE_LOCATIONS,
  FIXTURE_INVENTORY_STATE,
  detectConflictsLogic,
  calculateRedistributionLogic,
  explainDecisionLocalMock
} from '@setu/shared';

export type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'RECONCILED';

export interface Driver {
  id: string;
  name: string;
  vehicle: string;
  status: 'ASSIGNED' | 'LOADING' | 'DELAYED' | 'IN_TRANSIT' | 'DELIVERED';
  assignedRoute?: {
    from: string;
    to: string;
  };
  payload?: {
    item: string;
    quantity: number;
  };
  eta?: string;
}

export interface DemoStateContextType {
  locations: LocationProfile[];
  inventory: InventoryState[];
  drivers: Driver[];
  events: Event[];
  conflicts: Conflict[];
  recommendations: Recommendation[];
  offlineQueue: Event[];
  networkStatus: ConnectionStatus;
  
  // Actions
  setNetworkStatus: (status: ConnectionStatus) => void;
  addEvent: (event: Omit<Event, 'eventId' | 'timestamp' | 'syncStatus'>) => void;
  syncOfflineQueue: () => void;
  resolveConflict: (conflictId: string, resolution: string) => void;
  createSupplyRequest: (locationId: string, item: string, quantity: number) => void;
  getExplainedDecision: (recommendationId: string) => string | null;
  toggleSimulateOffline: () => void;
}

const DemoContext = createContext<DemoStateContextType | null>(null);

const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'D-1',
    name: 'Driver One',
    vehicle: 'Truck Alpha (10L)',
    status: 'ASSIGNED',
    assignedRoute: { from: 'WH-1', to: 'Camp-A' },
    payload: { item: 'Water (L)', quantity: 2000 },
    eta: '45 mins',
  },
  {
    id: 'D-2',
    name: 'Driver Two',
    vehicle: 'Van Beta',
    status: 'LOADING',
    assignedRoute: { from: 'WH-1', to: 'Camp-C' },
    payload: { item: 'Water (L)', quantity: 1500 },
    eta: 'Pending',
  },
  {
    id: 'D-3',
    name: 'Driver Three',
    vehicle: 'Truck Gamma',
    status: 'DELAYED',
    assignedRoute: { from: 'WH-2', to: 'Camp-B' },
    payload: { item: 'Medical', quantity: 50 },
    eta: 'Unknown',
  }
];

const INITIAL_EVENTS: Event[] = [];

export function DemoProvider({ children }: { children: ReactNode }) {
  const [locations] = useState<LocationProfile[]>([
    ...FIXTURE_LOCATIONS,
    { locationId: 'WH-2', name: 'Warehouse Two', type: 'WAREHOUSE' }
  ]);
  
  const [inventory, setInventory] = useState<InventoryState[]>([
    ...FIXTURE_INVENTORY_STATE,
    { locationId: 'WH-1', item: 'Water (L)', confirmedQuantity: 4000, unconfirmedQuantity: 0, lastVerifiedAt: new Date().toISOString() },
    { locationId: 'WH-2', item: 'Water (L)', confirmedQuantity: 1000, unconfirmedQuantity: 0, lastVerifiedAt: new Date().toISOString() }
  ]);
  
  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DRIVERS);
  const [events, setEvents] = useState<Event[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<Event[]>([]);
  
  const [networkStatus, setNetworkStatus] = useState<ConnectionStatus>('ONLINE');
  const [simulateOffline, setSimulateOffline] = useState<boolean>(false);
  
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const channelRef = useRef<BroadcastChannel | null>(null);

  // Initialize from LocalStorage and set up BroadcastChannel
  useEffect(() => {
    // Load events from LocalStorage
    const storedEvents = localStorage.getItem('setu_events');
    if (storedEvents) {
      try {
        setEvents(JSON.parse(storedEvents));
      } catch (e) {
        setEvents(INITIAL_EVENTS);
      }
    } else {
      setEvents(INITIAL_EVENTS);
    }

    // Load offline queue (specific to this tab/device, but we can store it in LS too)
    const storedQueue = localStorage.getItem('setu_offline_queue');
    if (storedQueue) {
      try {
        setOfflineQueue(JSON.parse(storedQueue));
      } catch (e) {
        setOfflineQueue([]);
      }
    }

    // Set up BroadcastChannel
    const channel = new BroadcastChannel('setu-demo-bus');
    channelRef.current = channel;

    channel.onmessage = (event) => {
      if (event.data?.type === 'ADD_EVENT') {
        const newEvent = event.data.payload as Event;
        setEvents(prev => {
          // Prevent duplicates if multiple tabs process the same thing
          if (prev.some(e => e.eventId === newEvent.eventId)) return prev;
          
          const updated = [newEvent, ...prev];
          localStorage.setItem('setu_events', JSON.stringify(updated));
          return updated;
        });
      }
    };

    // Listen to real network status changes
    const handleOnline = () => {
      if (!simulateOffline) {
        setNetworkStatus('ONLINE');
      }
    };
    const handleOffline = () => {
      setNetworkStatus('OFFLINE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setNetworkStatus('OFFLINE');
    }

    return () => {
      channel.close();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [simulateOffline]);

  // Handle Simulate Offline toggle effect
  useEffect(() => {
    if (simulateOffline) {
      setNetworkStatus('OFFLINE');
    } else if (navigator.onLine) {
      // Transition from offline to online means we should sync if there's a queue
      if (networkStatus === 'OFFLINE' && offlineQueue.length > 0) {
        syncOfflineQueue();
      } else {
        setNetworkStatus('ONLINE');
      }
    }
  }, [simulateOffline]);

  // Derived states recalculation
  useEffect(() => {
    if (networkStatus === 'ONLINE' || networkStatus === 'RECONCILED') {
      const newConflicts = detectConflictsLogic(events, inventory);
      
      setTimeout(() => {
        setConflicts(newConflicts);
        
        if (newConflicts.length > 0) {
          const newRecs = calculateRedistributionLogic(inventory, newConflicts, 4000, 'Water (L)', locations);
          setRecommendations(newRecs);
        } else {
          setRecommendations([]);
        }
      }, 0);
    }
  }, [events, inventory, networkStatus, locations]);

  const addEvent = (eventData: Omit<Event, 'eventId' | 'timestamp' | 'syncStatus'>) => {
    const isOnline = networkStatus === 'ONLINE' || networkStatus === 'RECONCILED';
    const newEvent: Event = {
      ...eventData,
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      syncStatus: isOnline ? 'SYNCED' : 'PENDING'
    };

    if (newEvent.syncStatus === 'PENDING') {
      setOfflineQueue(prev => {
        const updated = [...prev, newEvent];
        localStorage.setItem('setu_offline_queue', JSON.stringify(updated));
        return updated;
      });
    } else {
      setEvents(prev => {
        const updated = [newEvent, ...prev];
        localStorage.setItem('setu_events', JSON.stringify(updated));
        return updated;
      });
      // Broadcast to other tabs
      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'ADD_EVENT', payload: newEvent });
      }
    }
  };

  const syncOfflineQueue = () => {
    if (offlineQueue.length === 0) {
      setNetworkStatus('ONLINE');
      return;
    }
    setNetworkStatus('SYNCING');
    
    // Simulate network delay for effect
    setTimeout(() => {
      const syncedEvents = offlineQueue.map(e => ({ ...e, syncStatus: 'SYNCED' as const }));
      
      setEvents(prev => {
        const updated = [...syncedEvents, ...prev];
        localStorage.setItem('setu_events', JSON.stringify(updated));
        return updated;
      });
      
      // Broadcast all synced events
      if (channelRef.current) {
        syncedEvents.forEach(ev => {
          channelRef.current!.postMessage({ type: 'ADD_EVENT', payload: ev });
        });
      }

      setOfflineQueue([]);
      localStorage.removeItem('setu_offline_queue');
      setNetworkStatus('RECONCILED');
      
      setTimeout(() => setNetworkStatus('ONLINE'), 2500);
    }, 1500);
  };

  const resolveConflict = (conflictId: string, resolution: string) => {
    setConflicts(prev => prev.filter(c => c.conflictId !== conflictId));
    // Could add event for resolution
  };

  const createSupplyRequest = (locationId: string, item: string, quantity: number) => {
    addEvent({
      deviceId: 'demo-device',
      actorId: 'DemoUser',
      locationId,
      eventType: 'REQUEST_SUBMITTED',
      payload: { item, quantity }
    });
  };

  const getExplainedDecision = (recommendationId: string) => {
    const rec = recommendations.find(r => r.recommendationId === recommendationId);
    if (!rec) return null;
    return explainDecisionLocalMock(rec, locations);
  };

  const toggleSimulateOffline = () => {
    setSimulateOffline(prev => !prev);
  };

  return (
    <DemoContext.Provider value={{
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
    </DemoContext.Provider>
  );
}

export function useDemoState() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemoState must be used within a DemoProvider');
  }
  return context;
}
