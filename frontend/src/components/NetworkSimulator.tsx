'use client';
import { useState, useEffect } from 'react';
import { getOfflineEvents } from '@/lib/db';
import { flushQueue } from '@/lib/sync';
import { motion, AnimatePresence } from 'framer-motion';

type NetworkState = 'online' | 'offline' | 'syncing' | 'synced';

/**
 * NetworkSimulator — handles both REAL browser online/offline events
 * AND a demo-mode toggle for hackathon presentations.
 *
 * Real disconnection (e.g. turning off Wi-Fi) triggers the same UI
 * as the demo toggle. The toggle is collapsed by default to avoid
 * looking fake during a live demo.
 */
export default function NetworkSimulator() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [networkState, setNetworkState] = useState<NetworkState>('online');
  const [demoControlsOpen, setDemoControlsOpen] = useState(false);

  // ── Real browser online/offline events ──────────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setNetworkState('syncing');
      window.dispatchEvent(new CustomEvent('network-change', { detail: { isOnline: true } }));
      await flushQueue();
      setNetworkState('synced');
      setTimeout(() => setNetworkState('online'), 2500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkState('offline');
      window.dispatchEvent(new CustomEvent('network-change', { detail: { isOnline: false } }));
    };

    // Sync initial state with browser
    if (typeof navigator !== 'undefined') {
      setTimeout(() => {
        setIsOnline(navigator.onLine);
        if (!navigator.onLine) setNetworkState('offline');
      }, 0);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── IndexedDB queue count (live) ─────────────────────────────────────────
  useEffect(() => {
    const updateQueueCount = async () => {
      const events = await getOfflineEvents();
      setQueueCount(events.length);
    };
    updateQueueCount();
    const interval = setInterval(updateQueueCount, 1000);
    window.addEventListener('queue-updated', updateQueueCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener('queue-updated', updateQueueCount);
    };
  }, []);

  // ── Demo toggle (simulates disconnect without physically unplugging) ──────
  const toggleNetworkDemo = async () => {
    const newState = !isOnline;
    setIsOnline(newState);
    window.dispatchEvent(new CustomEvent('network-change', { detail: { isOnline: newState } }));

    if (newState) {
      setNetworkState('syncing');
      await flushQueue();
      setNetworkState('synced');
      setTimeout(() => setNetworkState('online'), 2500);
    } else {
      setNetworkState('offline');
    }
  };

  return (
    <div style={{
      borderTop: '1px solid var(--setu-dust)',
      background: 'var(--setu-bone)',
    }}>
      {/* Main status bar */}
      <div style={{
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        {/* Left: status */}
        <div>
          <div className="setu-label" style={{ marginBottom: '0.4rem' }}>Network Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={isOnline ? 'setu-dot-live' : 'setu-dot-crisis'} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isOnline ? 'var(--setu-verified)' : 'var(--setu-crisis)' }}>
                {isOnline ? 'CONNECTED' : 'OFFLINE'}
              </span>
            </div>
            {queueCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontFamily: 'Courier New, monospace', fontWeight: 700, fontSize: '1.1rem', color: 'var(--setu-amber)' }}>
                  {queueCount}
                </span>
                <span className="setu-label" style={{ color: 'var(--setu-amber)' }}>pending</span>
              </div>
            )}
          </div>
          <AnimatePresence mode="wait">
            {networkState === 'syncing' && (
              <motion.div key="syncing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--setu-amber)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '0.9rem' }}>↻</span>
                SYNC RESTORED — TRANSMITTING QUEUE…
              </motion.div>
            )}
            {networkState === 'synced' && (
              <motion.div key="synced" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--setu-verified)', fontWeight: 600 }}>
                ✓ EVENTS TRANSMITTED
              </motion.div>
            )}
            {networkState === 'offline' && (
              <motion.div key="offline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--setu-crisis)' }}>
                Events will queue in IndexedDB
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: demo controls toggle */}
        <button
          onClick={() => setDemoControlsOpen(p => !p)}
          style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            color: 'var(--setu-ash)',
            background: 'transparent',
            border: '1px solid var(--setu-dust)',
            padding: '0.3rem 0.7rem',
            borderRadius: '2px',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            fontFamily: 'var(--font-ui)',
          }}
        >
          {demoControlsOpen ? 'HIDE DEMO CONTROLS' : 'DEMO CONTROLS'}
        </button>
      </div>

      {/* Collapsible demo control panel */}
      <AnimatePresence>
        {demoControlsOpen && (
          <motion.div
            key="demo-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden', borderTop: '1px solid var(--setu-dust)' }}
          >
            <div style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: '#F0EBE0' }}>
              <div>
                <div className="setu-label" style={{ color: 'var(--setu-amber)', marginBottom: '0.25rem' }}>⚠ Demo Mode</div>
                <p style={{ fontSize: '0.7rem', color: 'var(--setu-dim)', margin: 0 }}>
                  Simulates network disconnect without physically unplugging. Real disconnects (Wi-Fi off) trigger the same flow.
                </p>
              </div>
              <button
                onClick={toggleNetworkDemo}
                disabled={networkState === 'syncing'}
                style={{
                  padding: '0.55rem 1.1rem',
                  background: isOnline ? 'rgba(185,28,28,0.1)' : 'rgba(45,106,79,0.1)',
                  color: isOnline ? 'var(--setu-crisis)' : 'var(--setu-verified)',
                  border: `1px solid ${isOnline ? 'rgba(185,28,28,0.3)' : 'rgba(45,106,79,0.3)'}`,
                  borderRadius: '2px',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  letterSpacing: '0.08em',
                  cursor: networkState === 'syncing' ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-ui)',
                  opacity: networkState === 'syncing' ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {isOnline ? 'SIMULATE DISCONNECT' : 'RECONNECT'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
