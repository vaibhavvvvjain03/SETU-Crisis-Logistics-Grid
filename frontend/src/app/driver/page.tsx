'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDemoState } from '@/lib/DemoState';

type RouteStatus = 'EN_ROUTE' | 'DELIVERED' | 'DIVERTED' | 'DELAYED';
type ActionStatus = 'idle' | 'submitting' | 'success' | 'queued' | 'error';

const STATUS_COLORS: Record<RouteStatus, { bg: string; color: string; border: string; label: string }> = {
  EN_ROUTE:  { bg: 'rgba(30,80,140,0.1)', color: '#1E508C', border: 'rgba(30,80,140,0.3)', label: 'EN ROUTE' },
  DELIVERED: { bg: 'var(--setu-verified-bg)', color: 'var(--setu-verified)', border: 'rgba(45,106,79,0.3)', label: 'DELIVERED' },
  DIVERTED:  { bg: 'var(--setu-crisis-bg)', color: 'var(--setu-crisis)', border: 'rgba(185,28,28,0.3)', label: 'DIVERTED' },
  DELAYED:   { bg: 'var(--setu-amber-bg)', color: 'var(--setu-amber)', border: 'rgba(201,68,13,0.3)', label: 'DELAYED' },
};

export default function DriverTerminal() {
  const { networkStatus, offlineQueue, addEvent } = useDemoState();
  const isOnline = networkStatus !== 'OFFLINE';
  const router = useRouter();

  const handleSignOut = async () => {
    const { signOut } = await import('@/lib/auth');
    await signOut();
    router.push('/login');
  };

  const [currentStatus, setCurrentStatus] = useState<RouteStatus>('EN_ROUTE');
  const [from, setFrom] = useState('WH-1');
  const [to, setTo] = useState('Camp-A');
  const [quantity, setQuantity] = useState(500);
  const [actionStatus, setActionStatus] = useState<ActionStatus>('idle');
  const [actionMsg, setActionMsg] = useState('');
  const [eventLog, setEventLog] = useState<{ time: string; status: RouteStatus; from: string; to: string; qty: number }[]>([]);

  const submitRouteStatus = (status: RouteStatus) => {
    setActionStatus('submitting');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addEvent({
      deviceId: 'demo-device',
      actorId: 'driver',
      locationId: to,
      eventType: 'ROUTE_STATUS_UPDATED',
      payload: { status, quantity, routeFrom: from, routeTo: to }
    });

    setTimeout(() => {
      setCurrentStatus(status);
      setEventLog(prev => [{ time: new Date().toLocaleTimeString(), status, from, to, qty: quantity }, ...prev.slice(0, 9)]);

      if (isOnline) {
        setActionStatus('success');
        setActionMsg(`ROUTE STATUS UPDATED — ${STATUS_COLORS[status].label}`);
      } else {
        setActionStatus('queued');
        setActionMsg('OFFLINE — status queued in local state');
      }
    }, 400);
  };

  const statusColors = STATUS_COLORS[currentStatus];

  const LOCATIONS: Record<string, string> = {
    'WH-1': 'Warehouse One',
    'Camp-A': 'Camp Alpha',
    'Camp-B': 'Camp Bravo',
    'Camp-C': 'Camp Charlie',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--setu-paper)', color: 'var(--setu-ink)', fontFamily: 'var(--font-ui)', display: 'flex', flexDirection: 'column', transition: 'background 800ms ease' }}>
      <header style={{ background: 'var(--setu-paper)', color: 'var(--setu-ink)', padding: '0.85rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--setu-ink)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>SETU</span>
          <span className="setu-label" style={{ color: 'var(--setu-dim)' }}>Driver Terminal</span>
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
              LOCAL MODE — Status updates queued in local state · {offlineQueue.length} pending
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '3rem 1.5rem' }}>
        <div style={{ width: '100%', maxWidth: '540px' }}>
          <motion.div
            key={currentStatus}
            initial={{ opacity: 0.8, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              marginBottom: '2rem',
              padding: '2rem',
              background: statusColors.bg,
              border: `1px solid ${statusColors.border}`,
              borderRadius: '2px',
            }}
          >
            <div className="setu-label" style={{ color: statusColors.color, marginBottom: '0.75rem' }}>CURRENT ROUTE STATUS</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '3rem', color: statusColors.color, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '1rem' }}>
              {statusColors.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--setu-dim)' }}>
              <span style={{ fontWeight: 600 }}>{LOCATIONS[from] ?? from}</span>
              <span style={{ color: statusColors.color }}>→</span>
              <span style={{ fontWeight: 600 }}>{LOCATIONS[to] ?? to}</span>
              <span style={{ marginLeft: '0.5rem', fontFamily: 'Courier New, monospace', fontWeight: 700 }}>{quantity.toLocaleString()}L</span>
            </div>
          </motion.div>

          <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'var(--setu-bone)', borderLeft: '3px solid var(--setu-dust)' }}>
            <div className="setu-label" style={{ marginBottom: '1rem' }}>Route Details</div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div>
                <div className="setu-label" style={{ marginBottom: '0.3rem', fontSize: '0.6rem' }}>Origin</div>
                <select value={from} onChange={e => setFrom(e.target.value)}
                  style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font-ui)', background: 'var(--setu-paper)', color: 'var(--setu-ink)', border: '1px solid var(--setu-dust)', borderRadius: '2px', cursor: 'pointer' }}>
                  {Object.entries(LOCATIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <div className="setu-label" style={{ marginBottom: '0.3rem', fontSize: '0.6rem' }}>Destination</div>
                <select value={to} onChange={e => setTo(e.target.value)}
                  style={{ padding: '0.45rem 0.6rem', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font-ui)', background: 'var(--setu-paper)', color: 'var(--setu-ink)', border: '1px solid var(--setu-dust)', borderRadius: '2px', cursor: 'pointer' }}>
                  {Object.entries(LOCATIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <div className="setu-label" style={{ marginBottom: '0.3rem', fontSize: '0.6rem' }}>Quantity (L)</div>
                <input type="number" value={quantity} min={0} onChange={e => setQuantity(Number(e.target.value))}
                  style={{ padding: '0.45rem 0.6rem', fontFamily: 'Courier New, monospace', fontSize: '0.95rem', fontWeight: 700, background: 'var(--setu-paper)', color: 'var(--setu-ink)', border: '1px solid var(--setu-dust)', borderRadius: '2px', width: '100px' }} />
              </div>
            </div>
          </div>

          <div className="setu-label" style={{ marginBottom: '0.75rem' }}>Update Route Status</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
            {(['EN_ROUTE', 'DELIVERED', 'DIVERTED', 'DELAYED'] as RouteStatus[]).map(status => {
              const sc = STATUS_COLORS[status];
              const isActive = currentStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => submitRouteStatus(status)}
                  disabled={actionStatus === 'submitting'}
                  style={{
                    padding: '0.85rem',
                    background: isActive ? sc.bg : 'var(--setu-bone)',
                    color: isActive ? sc.color : 'var(--setu-dim)',
                    border: `1px solid ${isActive ? sc.border : 'var(--setu-dust)'}`,
                    borderRadius: '2px',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    letterSpacing: '0.08em',
                    cursor: actionStatus === 'submitting' ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-ui)',
                    transition: 'all 200ms',
                    outline: isActive ? `2px solid ${sc.color}` : 'none',
                    outlineOffset: '-2px',
                  }}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {actionStatus !== 'idle' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                style={{
                  padding: '0.75rem 1rem', borderRadius: '2px', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '1.5rem',
                  ...(actionStatus === 'success' ? { background: 'var(--setu-verified-bg)', color: 'var(--setu-verified)', border: '1px solid rgba(45,106,79,0.25)' }
                    : actionStatus === 'queued' ? { background: 'var(--setu-amber-bg)', color: 'var(--setu-amber)', border: '1px solid rgba(201,68,13,0.25)' }
                    : actionStatus === 'error' ? { background: 'var(--setu-crisis-bg)', color: 'var(--setu-crisis)', border: '1px solid rgba(185,28,28,0.25)' }
                    : { background: 'var(--setu-bone)', color: 'var(--setu-dim)', border: '1px solid var(--setu-dust)' }),
                }}>
                {actionMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {eventLog.length > 0 && (
            <div>
              <div className="setu-label" style={{ marginBottom: '0.5rem' }}>Session Log</div>
              <div style={{ background: 'var(--setu-bone)', border: '1px solid var(--setu-dust)', borderRadius: '2px' }}>
                {eventLog.map((entry, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 90px 1fr auto', gap: '0.75rem', padding: '0.5rem 0.75rem', borderBottom: i < eventLog.length - 1 ? '1px solid var(--setu-dust)' : 'none', fontSize: '0.72rem' }}>
                    <span style={{ color: 'var(--setu-ash)', fontFamily: 'Courier New, monospace' }}>{entry.time}</span>
                    <span style={{ color: STATUS_COLORS[entry.status].color, fontWeight: 700 }}>{STATUS_COLORS[entry.status].label}</span>
                    <span style={{ color: 'var(--setu-dim)' }}>{LOCATIONS[entry.from]} → {LOCATIONS[entry.to]}</span>
                    <span style={{ color: 'var(--setu-dim)', fontFamily: 'Courier New, monospace' }}>{entry.qty.toLocaleString()}L</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
