'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useApiState } from '@/lib/ApiState';
import { LocationProfile } from '@setu/shared';

type ActionStatus = 'idle' | 'submitting' | 'success' | 'queued' | 'error';

export default function WarehouseTerminal() {
  const { locations, inventory, conflicts, networkStatus, offlineQueue, addEvent } = useApiState();
  const isOnline = networkStatus !== 'OFFLINE';
  const router = useRouter();

  const handleSignOut = async () => {
    const { signOut } = await import('@/lib/auth');
    await signOut();
    router.push('/login');
  };

  const warehouseStock = inventory.find(s => s.locationId === 'WH-1');
  const campStates = inventory.filter(s => s.locationId !== 'WH-1');

  const [dispatchTo, setDispatchTo] = useState('Camp-A');
  const [dispatchQty, setDispatchQty] = useState(500);
  const [stockQty, setStockQty] = useState(4000);
  const [dispatchStatus, setDispatchStatus] = useState<ActionStatus>('idle');
  const [dispatchMsg, setDispatchMsg] = useState('');
  const [stockStatus, setStockStatus] = useState<ActionStatus>('idle');
  const [stockMsg, setStockMsg] = useState('');

  const sendEvent = (eventType: string, payload: Record<string, unknown>, setStatus: (s: ActionStatus) => void, setMsg: (m: string) => void) => {
    setStatus('submitting');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addEvent({ deviceId: 'demo-device', actorId: 'warehouse', locationId: 'WH-1', eventType: eventType as any, payload });

    setTimeout(() => {
      if (isOnline) {
        setStatus('success');
        setMsg(`EVENT TRANSMITTED — ${eventType}`);
      } else {
        setStatus('queued');
        setMsg('OFFLINE — event queued in local state');
      }
    }, 400);
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    sendEvent('DISPATCH_RECORDED', { item: 'Water (L)', quantity: dispatchQty, destination: dispatchTo }, setDispatchStatus, setDispatchMsg);
  };

  const handleStockUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    sendEvent('STOCK_UPDATE', { item: 'Water (L)', quantity: stockQty }, setStockStatus, setStockMsg);
  };

  const locationIndex: Record<string, LocationProfile> = {};
  for (const l of locations) locationIndex[l.locationId] = l;

  const statusStyle = (s: ActionStatus): React.CSSProperties => {
    const map: Record<ActionStatus, { bg: string; color: string; border: string }> = {
      idle: { bg: 'transparent', color: 'transparent', border: 'transparent' },
      submitting: { bg: 'var(--setu-bone)', color: 'var(--setu-dim)', border: 'var(--setu-dust)' },
      success: { bg: 'var(--setu-verified-bg)', color: 'var(--setu-verified)', border: 'rgba(45,106,79,0.25)' },
      queued: { bg: 'var(--setu-amber-bg)', color: 'var(--setu-amber)', border: 'rgba(201,68,13,0.25)' },
      error: { bg: 'var(--setu-crisis-bg)', color: 'var(--setu-crisis)', border: 'rgba(185,28,28,0.25)' },
    };
    return { padding: '0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em', ...map[s] };
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--setu-paper)', color: 'var(--setu-ink)', fontFamily: 'var(--font-ui)', display: 'flex', flexDirection: 'column', transition: 'background 800ms ease' }}>
      <header style={{ background: 'var(--setu-paper)', color: 'var(--setu-ink)', padding: '0.85rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--setu-ink)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>SETU</span>
          <span className="setu-label" style={{ color: 'var(--setu-dim)' }}>Warehouse Terminal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {offlineQueue.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              <span style={{ fontFamily: 'Courier New, monospace', fontWeight: 700, fontSize: '1.25rem', color: 'var(--setu-amber)', lineHeight: 1 }}>{offlineQueue.length}</span>
              <span className="setu-label" style={{ color: 'var(--setu-amber)' }}>PENDING</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className={isOnline ? 'setu-dot-live' : 'setu-dot-crisis'} />
            <span className="setu-label" style={{ color: isOnline ? 'var(--setu-verified)' : 'var(--setu-crisis)' }}>
              {isOnline ? 'CONNECTED' : 'LOCAL MODE'}
            </span>
          </div>
          <Link href="/command" style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--setu-dim)', textDecoration: 'none', borderLeft: '1px solid var(--setu-dust)', paddingLeft: '1rem', letterSpacing: '0.06em' }}>COMMAND CENTRE</Link>
          <button onClick={handleSignOut} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 600, color: 'var(--setu-dim)', textDecoration: 'none', borderLeft: '1px solid var(--setu-dust)', paddingLeft: '1rem', letterSpacing: '0.06em' }}>EXIT</button>
        </div>
      </header>

      <AnimatePresence>
        {!isOnline && (
          <motion.div key="offline" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4 }}
            style={{ overflow: 'hidden', background: 'var(--setu-crisis)', color: 'white' }}>
            <div style={{ padding: '0.6rem 2rem', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.06em' }}>
              LOCAL MODE — Actions queued in local state · {offlineQueue.length} pending
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 0, minHeight: 0, overflow: 'auto' }}>
        <div style={{ padding: '2rem', borderRight: '1px solid var(--setu-dust)' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div className="setu-label" style={{ marginBottom: '0.75rem' }}>Warehouse One — Current Inventory</div>
            {warehouseStock ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                <span style={{ fontFamily: 'Courier New, monospace', fontSize: '3.5rem', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--setu-ink)', lineHeight: 1 }}>
                  {warehouseStock.confirmedQuantity.toLocaleString()}
                </span>
                <span style={{ fontSize: '1rem', color: 'var(--setu-dim)' }}>L Water</span>
              </div>
            ) : (
              <div className="setu-label" style={{ color: 'var(--setu-ash)' }}>Loading…</div>
            )}
          </div>

          <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'var(--setu-bone)', borderLeft: '3px solid var(--setu-dust)' }}>
            <div className="setu-label" style={{ marginBottom: '1rem' }}>Report Inventory (STOCK_UPDATE)</div>
            <form onSubmit={handleStockUpdate} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <div className="setu-label" style={{ marginBottom: '0.3rem', fontSize: '0.6rem' }}>Quantity (L)</div>
                <input type="number" value={stockQty} min={0} onChange={e => setStockQty(Number(e.target.value))}
                  style={{ padding: '0.5rem 0.75rem', fontFamily: 'Courier New, monospace', fontSize: '1.1rem', fontWeight: 700, background: 'var(--setu-paper)', border: '1px solid var(--setu-dust)', borderRadius: '2px', color: 'var(--setu-ink)', width: '130px' }} />
              </div>
              <button type="submit" disabled={stockStatus === 'submitting'}
                style={{ padding: '0.55rem 1rem', background: 'var(--setu-ink)', color: 'var(--setu-paper)', border: 'none', borderRadius: '2px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                {stockStatus === 'submitting' ? 'REPORTING…' : 'REPORT STOCK'}
              </button>
            </form>
            <AnimatePresence>
              {stockStatus !== 'idle' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                  style={{ marginTop: '0.75rem', ...statusStyle(stockStatus) }}>
                  {stockMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ padding: '1.25rem', background: 'var(--setu-bone)', borderLeft: '3px solid var(--setu-verified)' }}>
            <div className="setu-label" style={{ marginBottom: '1rem', color: 'var(--setu-verified)' }}>Dispatch Supply (DISPATCH_RECORDED)</div>
            <form onSubmit={handleDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <div className="setu-label" style={{ marginBottom: '0.3rem', fontSize: '0.6rem' }}>Destination</div>
                  <select value={dispatchTo} onChange={e => setDispatchTo(e.target.value)}
                    style={{ padding: '0.55rem 0.75rem', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-ui)', background: 'var(--setu-paper)', color: 'var(--setu-ink)', border: '1px solid var(--setu-dust)', borderRadius: '2px', cursor: 'pointer' }}>
                    <option value="Camp-A">Camp Alpha</option>
                    <option value="Camp-B">Camp Bravo</option>
                    <option value="Camp-C">Camp Charlie</option>
                  </select>
                </div>
                <div>
                  <div className="setu-label" style={{ marginBottom: '0.3rem', fontSize: '0.6rem' }}>Quantity (L)</div>
                  <input type="number" value={dispatchQty} min={1} onChange={e => setDispatchQty(Number(e.target.value))}
                    style={{ padding: '0.5rem 0.75rem', fontFamily: 'Courier New, monospace', fontSize: '1.1rem', fontWeight: 700, background: 'var(--setu-paper)', border: '1px solid var(--setu-dust)', borderRadius: '2px', color: 'var(--setu-ink)', width: '120px' }} />
                </div>
                <button type="submit" disabled={dispatchStatus === 'submitting'}
                  style={{ padding: '0.55rem 1.25rem', background: 'var(--setu-verified)', color: 'white', border: 'none', borderRadius: '2px', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                  {dispatchStatus === 'submitting' ? 'DISPATCHING…' : 'DISPATCH →'}
                </button>
              </div>
            </form>
            <AnimatePresence>
              {dispatchStatus !== 'idle' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                  style={{ marginTop: '0.75rem', ...statusStyle(dispatchStatus) }}>
                  {dispatchMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--setu-dust)', flexShrink: 0 }}>
            <div className="setu-label">Camp Status</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
            {campStates.map(camp => {
              const profile = locationIndex[camp.locationId];
              const survivalHours = profile?.survivalWindowHours;
              const isCritical = survivalHours !== undefined && survivalHours < 6;
              const isHigh = survivalHours !== undefined && survivalHours < 24;
              const hasConflict = conflicts.some(c => c.locationId === camp.locationId);
              return (
                <div key={camp.locationId} style={{ marginBottom: '0.75rem', padding: '1rem', background: isCritical ? 'var(--setu-crisis-bg)' : 'var(--setu-bone)', borderLeft: `3px solid ${isCritical ? 'var(--setu-crisis)' : isHigh ? 'var(--setu-high)' : 'var(--setu-dust)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{profile?.name ?? camp.locationId}</span>
                    {hasConflict && <span className="setu-badge-critical">CONFLICT</span>}
                  </div>
                  <div style={{ fontFamily: 'Courier New, monospace', fontSize: '1.75rem', fontWeight: 700, color: isCritical ? 'var(--setu-crisis)' : 'var(--setu-ink)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '0.25rem' }}>
                    {camp.confirmedQuantity.toLocaleString()}L
                  </div>
                  {survivalHours !== undefined && (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: isCritical ? 'var(--setu-crisis)' : isHigh ? 'var(--setu-high)' : 'var(--setu-dim)', fontWeight: 600, marginBottom: '0.25rem' }}>
                        {survivalHours < 24 ? `${survivalHours}h survival window` : `${Math.round(survivalHours / 24)}d survival`}
                      </div>
                      <div style={{ height: '3px', background: 'var(--setu-dust)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (survivalHours / 72) * 100)}%`, background: isCritical ? 'var(--setu-crisis)' : isHigh ? 'var(--setu-high)' : 'var(--setu-verified)', borderRadius: '2px', transition: 'width 600ms ease' }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
