'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useApiState } from '@/lib/ApiState';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'queued' | 'error';
interface SubmitResult {
  status: SubmitStatus;
  message: string;
}

const ROLE_LABELS: Record<string, string> = {
  camp: 'CAMP OFFICER',
  warehouse: 'WAREHOUSE',
  driver: 'DRIVER',
  coordinator: 'COORDINATOR',
};

const EVENT_LABELS: Record<string, string> = {
  STOCK_UPDATE: 'Stock Update',
  REQUEST_SUBMITTED: 'Request Supply',
  DISPATCH_RECORDED: 'Record Dispatch',
  ROUTE_STATUS_UPDATED: 'Route Status',
  DELIVERY_CONFIRMED: 'Confirm Delivery',
};

function FieldTerminalInner() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'camp';
  
  const { locations, inventory, networkStatus, offlineQueue, addEvent, toggleSimulateOffline } = useApiState();
  const isOnline = networkStatus !== 'OFFLINE';
  const router = useRouter();

  const handleSignOut = async () => {
    const { signOut } = await import('@/lib/auth');
    await signOut();
    router.push('/login');
  };

  const [result, setResult] = useState<SubmitResult>({ status: 'idle', message: '' });
  const [updateType, setUpdateType] = useState<string>('STOCK_UPDATE');
  const [quantity, setQuantity] = useState(100);
  const [locationId, setLocationId] = useState('Camp-A');
  const [routeStatus, setRouteStatus] = useState('DELIVERED');

  const campStock = inventory.find(i => i.locationId === locationId);
  const campProfile = locations.find(l => l.locationId === locationId);

  const buildPayload = () => {
    switch (updateType) {
      case 'ROUTE_STATUS_UPDATED': return { status: routeStatus, quantity };
      case 'REQUEST_SUBMITTED':    return { item: 'Water (L)', quantity, urgency: 'HIGH' };
      case 'STOCK_UPDATE':         return { item: 'Water (L)', quantity };
      case 'DISPATCH_RECORDED':    return { item: 'Water (L)', quantity, destination: locationId };
      case 'DELIVERY_CONFIRMED':   return { item: 'Water (L)', quantity };
      default:                     return { quantity };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult({ status: 'submitting', message: 'Transmitting…' });

    // Use DemoState's addEvent to update the unified state directly
    addEvent({
      deviceId: 'demo-device',
      actorId: role,
      locationId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventType: updateType as any,
      payload: buildPayload(),
    });

    setTimeout(() => {
      if (isOnline) {
        setResult({ status: 'success', message: `EVENT TRANSMITTED — ${updateType}` });
      } else {
        setResult({ status: 'queued', message: 'OFFLINE — event saved to local queue.' });
      }
    }, 400);
  };

  const eventTypesByRole: Record<string, string[]> = {
    camp:        ['STOCK_UPDATE', 'REQUEST_SUBMITTED', 'DELIVERY_CONFIRMED'],
    warehouse:   ['DISPATCH_RECORDED', 'STOCK_UPDATE'],
    driver:      ['ROUTE_STATUS_UPDATED'],
    coordinator: ['STOCK_UPDATE', 'REQUEST_SUBMITTED', 'DISPATCH_RECORDED', 'ROUTE_STATUS_UPDATED', 'DELIVERY_CONFIRMED'],
  };
  const availableTypes = eventTypesByRole[role] ?? eventTypesByRole.coordinator;

  const statusInfo: Record<SubmitStatus, { bg: string; color: string; border: string }> = {
    idle:       { bg: 'transparent', color: 'transparent', border: 'transparent' },
    submitting: { bg: 'var(--setu-bone)', color: 'var(--setu-dim)', border: 'var(--setu-dust)' },
    success:    { bg: 'var(--setu-verified-bg)', color: 'var(--setu-verified)', border: 'rgba(45,106,79,0.25)' },
    queued:     { bg: 'var(--setu-amber-bg)', color: 'var(--setu-amber)', border: 'rgba(201,68,13,0.25)' },
    error:      { bg: 'var(--setu-crisis-bg)', color: 'var(--setu-crisis)', border: 'rgba(185,28,28,0.25)' },
  };

  const survivalHours = campProfile?.survivalWindowHours;
  const isCritical = survivalHours !== undefined && survivalHours < 6;
  const isHigh = survivalHours !== undefined && survivalHours < 24;

  return (
    <div
      className={!isOnline ? 'setu-scanlines' : ''}
      style={{
        minHeight: '100vh',
        background: 'var(--setu-paper)',
        color: 'var(--setu-ink)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-ui)',
        transition: 'background 800ms ease, color 800ms ease',
        border: isOnline ? 'none' : '6px solid var(--setu-crisis)',
        boxSizing: 'border-box',
      }}
    >
      <header style={{
        background: 'var(--setu-paper)',
        color: 'var(--setu-ink)',
        padding: '0.85rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `2px solid ${isOnline ? 'var(--setu-ink)' : 'var(--setu-crisis)'}`,
        transition: 'background 800ms ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>SETU</span>
          <span className="setu-label" style={{ color: 'var(--setu-dim)' }}>Field Terminal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            type="button"
            onClick={toggleSimulateOffline}
            style={{ 
              background: 'transparent', border: `1px solid ${isOnline ? 'var(--setu-dust)' : 'var(--setu-crisis)'}`, 
              padding: '0.4rem 0.8rem', fontSize: '0.65rem', fontWeight: 700, 
              color: isOnline ? 'var(--setu-dim)' : 'var(--setu-crisis)', cursor: 'pointer' 
            }}
          >
            {isOnline ? 'SIMULATE DISCONNECT' : 'RECONNECT'}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid var(--setu-dust)', paddingLeft: '1rem' }}>
            <span className={isOnline ? 'setu-dot-live' : 'setu-dot-crisis'} />
            <span className="setu-label" style={{ color: isOnline ? 'var(--setu-verified)' : 'var(--setu-crisis)' }}>
              {isOnline ? 'CONNECTED' : 'LOCAL MODE'}
            </span>
          </div>
          <Link href="/command" target="_blank" style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--setu-dim)', textDecoration: 'none', borderLeft: '1px solid var(--setu-dust)', paddingLeft: '1rem', letterSpacing: '0.06em' }}>
            COMMAND CENTRE
          </Link>
          <button onClick={handleSignOut} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 600, color: 'var(--setu-dim)', textDecoration: 'none', borderLeft: '1px solid var(--setu-dust)', paddingLeft: '1rem', letterSpacing: '0.06em' }}>EXIT</button>
        </div>
      </header>

      <AnimatePresence>
        {!isOnline && (
          <motion.div
            key="offline-banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ overflow: 'hidden', background: 'var(--setu-crisis)', color: 'white' }}
          >
            <div style={{ padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.06em' }}>LOCAL MODE ACTIVE</div>
                <div className="setu-label" style={{ color: 'rgba(255,255,255,0.75)', marginTop: '0.1rem' }}>
                  All events saved to local state queue
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{ fontFamily: 'Courier New, monospace', fontWeight: 700, fontSize: '2rem', lineHeight: 1 }}>
                  {offlineQueue.length}
                </span>
                <span className="setu-label" style={{ color: 'rgba(255,255,255,0.8)' }}>PENDING</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ width: '100%', maxWidth: '520px' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div className="setu-label" style={{ marginBottom: '0.5rem', color: 'var(--setu-dim)' }}>
              {ROLE_LABELS[role] ?? role.toUpperCase()}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem, 6vw, 3rem)', letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--setu-ink)', textTransform: 'uppercase' }}>
              Field Terminal
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--setu-dim)', marginTop: '0.5rem' }}>
              Submit field events to the SETU reconciliation layer
            </p>
          </div>

          {campStock && (role === 'camp' || role === 'coordinator') && (
            <div style={{ marginBottom: '2rem', padding: '1rem', background: 'transparent', borderBottom: '2px solid var(--setu-ink)', borderLeft: `6px solid ${isCritical ? 'var(--setu-crisis)' : isHigh ? 'var(--setu-high)' : 'var(--setu-ink)'}` }}>
              <div className="setu-label" style={{ marginBottom: '0.5rem', color: isCritical ? 'var(--setu-crisis)' : 'var(--setu-dim)' }}>
                {campProfile?.name ?? locationId} — Current Stock
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                <span style={{ fontFamily: 'Courier New, monospace', fontWeight: 700, fontSize: '2rem', color: isCritical ? 'var(--setu-crisis)' : 'var(--setu-ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {campStock.confirmedQuantity.toLocaleString()}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--setu-dim)' }}>L</span>
                {survivalHours !== undefined && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isCritical ? 'var(--setu-crisis)' : isHigh ? 'var(--setu-high)' : 'var(--setu-dim)' }}>
                    {survivalHours < 24 ? `${survivalHours}h survival window` : `${Math.round(survivalHours / 24)}d survival`}
                  </span>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="setu-label" style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--setu-dim)' }}>Location</label>
                <select value={locationId} onChange={e => setLocationId(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem 1rem', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-ui)', background: 'var(--setu-paper)', color: 'var(--setu-ink)', border: `2px solid ${isOnline ? 'var(--setu-ink)' : 'var(--setu-crisis)'}`, borderRadius: '0', cursor: 'pointer', outline: 'none', appearance: 'none' }}>
                  <option value="Camp-A">Camp Alpha</option>
                  <option value="Camp-B">Camp Bravo</option>
                  <option value="Camp-C">Camp Charlie</option>
                  {(role === 'warehouse' || role === 'coordinator') && <option value="WH-1">Warehouse One</option>}
                </select>
              </div>

              <div>
                <label className="setu-label" style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--setu-dim)' }}>Event Type</label>
                <select value={updateType} onChange={e => setUpdateType(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem 1rem', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-ui)', background: 'var(--setu-paper)', color: 'var(--setu-ink)', border: `2px solid ${isOnline ? 'var(--setu-ink)' : 'var(--setu-crisis)'}`, borderRadius: '0', cursor: 'pointer', outline: 'none', appearance: 'none' }}>
                  {availableTypes.map(t => <option key={t} value={t}>{EVENT_LABELS[t]}</option>)}
                </select>
              </div>

              {updateType === 'ROUTE_STATUS_UPDATED' && (
                <div>
                  <label className="setu-label" style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--setu-dim)' }}>Route Status</label>
                  <select value={routeStatus} onChange={e => setRouteStatus(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem 1rem', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-ui)', background: 'var(--setu-paper)', color: 'var(--setu-ink)', border: `2px solid ${isOnline ? 'var(--setu-ink)' : 'var(--setu-crisis)'}`, borderRadius: '0', cursor: 'pointer', outline: 'none', appearance: 'none' }}>
                    <option value="DELIVERED">Delivered</option>
                    <option value="DIVERTED">Diverted</option>
                    <option value="DELAYED">Delayed</option>
                    <option value="EN_ROUTE">En Route</option>
                  </select>
                </div>
              )}

              <div>
                <label className="setu-label" style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--setu-dim)' }}>Quantity (L)</label>
                <input type="number" value={quantity} min={0} onChange={e => setQuantity(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.8rem 1rem', fontSize: '1.25rem', fontFamily: 'Courier New, monospace', fontWeight: 700, background: 'var(--setu-paper)', color: 'var(--setu-ink)', border: `2px solid ${isOnline ? 'var(--setu-ink)' : 'var(--setu-crisis)'}`, borderRadius: '0', outline: 'none' }} />
              </div>

              <button
                type="submit"
                disabled={result.status === 'submitting'}
                style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', background: result.status === 'submitting' ? 'var(--setu-ash)' : isOnline ? 'var(--setu-ink)' : 'var(--setu-crisis)', color: isOnline ? 'var(--setu-paper)' : 'white', border: isOnline ? '2px solid var(--setu-ink)' : '2px solid var(--setu-crisis)', borderRadius: '0', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.1em', cursor: result.status === 'submitting' ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)', transition: 'background 150ms' }}
              >
                {result.status === 'submitting' ? 'TRANSMITTING…' : isOnline ? 'SUBMIT EVENT' : 'SAVE TO LOCAL QUEUE'}
              </button>
            </div>
          </form>

          <AnimatePresence>
            {result.status !== 'idle' && (
              <motion.div
                key={result.status}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                style={{ marginTop: '1.5rem', padding: '1rem', background: statusInfo[result.status].bg, color: statusInfo[result.status].color, border: `2px solid ${statusInfo[result.status].color}`, borderRadius: '0', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.04em' }}
              >
                {result.message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function FieldTerminal() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--setu-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="setu-label" style={{ color: 'var(--setu-ash)' }}>Loading terminal…</div>
      </div>
    }>
      <FieldTerminalInner />
    </Suspense>
  );
}
