'use client';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface Phase {
  id: string;
  label: string;
  headline: string;
  subtext: string;
  networkState: 'connected' | 'fragmented' | 'conflict';
}

const PHASES: Phase[] = [
  {
    id: 'connected',
    label: 'Phase 01 — Operational',
    headline: 'THE GRID IS LIVE',
    subtext: 'Supply routes operational. Camp A, B, C reporting. Warehouse dispatches confirmed. All signals green.',
    networkState: 'connected',
  },
  {
    id: 'offline',
    label: 'Phase 02 — Connectivity Loss',
    headline: 'SIGNAL\nLOST',
    subtext: 'Network failure. Field devices drop to LOCAL MODE. Events queue in IndexedDB. No data is lost.',
    networkState: 'fragmented',
  },
  {
    id: 'conflict',
    label: 'Phase 03 — Conflict Detected',
    headline: 'DATA\nFRAGMENTS',
    subtext: 'Delivery marked DELIVERED by driver. Camp Bravo reports NO DELIVERY. 800L — location unknown. CONFLICT ACTIVE.',
    networkState: 'conflict',
  },
];

function NetworkState({ state }: { state: 'connected' | 'fragmented' | 'conflict' }) {
  const isConnected = state === 'connected';
  const isConflict = state === 'conflict';

  return (
    <svg viewBox="0 0 360 280" className="w-full h-full" aria-hidden="true">
      {/* WH → Camp A */}
      <line
        x1="180" y1="60"
        x2="60" y2="210"
        stroke={isConnected ? '#2D6A4F' : isConflict ? '#A09890' : 'rgba(15,14,12,0.08)'}
        strokeWidth={isConnected ? 2 : 1}
        strokeDasharray={!isConnected ? '4 8' : '8 4'}
        opacity={isConnected ? 1 : isConflict ? 0.3 : 0.15}
        className={isConnected ? 'animate-data-flow-slow' : ''}
      />
      {/* WH → Camp B (the conflict route) */}
      <line
        x1="180" y1="60"
        x2="180" y2="220"
        stroke={isConflict ? '#B91C1C' : isConnected ? '#2D6A4F' : 'rgba(15,14,12,0.08)'}
        strokeWidth={isConflict ? 2.5 : isConnected ? 2 : 1}
        strokeDasharray={isConflict ? '5 3' : '8 4'}
        opacity={isConflict ? 1 : isConnected ? 1 : 0.1}
        className={isConflict ? 'route-line-conflict' : isConnected ? 'animate-data-flow-slow' : ''}
      />
      {/* WH → Camp C */}
      <line
        x1="180" y1="60"
        x2="300" y2="210"
        stroke={isConnected ? '#2D6A4F' : 'rgba(15,14,12,0.08)'}
        strokeWidth={isConnected ? 2 : 1}
        strokeDasharray={!isConnected ? '4 8' : '8 4'}
        opacity={isConnected ? 1 : 0.1}
        className={isConnected ? 'animate-data-flow-slow' : ''}
      />
      {/* WH node */}
      <rect x="148" y="36" width="64" height="36" rx="3" fill={isConnected ? '#0F0E0C' : '#4A4540'} />
      <text x="180" y="52" textAnchor="middle" fill={isConnected ? '#F5F0E8' : '#9A9088'} fontSize="7.5" fontFamily="Space Grotesk, sans-serif" fontWeight="600" letterSpacing="0.08em">WAREHOUSE</text>
      <text x="180" y="63" textAnchor="middle" fill="#6B6560" fontSize="7" fontFamily="Space Grotesk, sans-serif">WH-1</text>
      {/* Camp A */}
      <circle cx="60" cy="222" r="26" fill={isConnected ? '#F5F0E8' : '#EDE8DD'} stroke={isConnected ? '#2D6A4F' : '#C8C0B0'} strokeWidth={isConnected ? 1.5 : 1} opacity={!isConnected && !isConflict ? 0.4 : 1} />
      <text x="60" y="219" textAnchor="middle" fill={isConnected ? '#0F0E0C' : '#9A9088'} fontSize="7" fontFamily="Space Grotesk, sans-serif" fontWeight="700">ALPHA</text>
      <text x="60" y="230" textAnchor="middle" fill="#B91C1C" fontSize="7" fontFamily="Space Grotesk, sans-serif" fontWeight="600">4h</text>
      {/* Camp B — conflict */}
      <circle cx="180" cy="232" r="26" fill={isConflict ? '#FEF2F2' : isConnected ? '#F5F0E8' : '#EDE8DD'} stroke={isConflict ? '#B91C1C' : isConnected ? '#2D6A4F' : '#C8C0B0'} strokeWidth={isConflict ? 2 : 1.5} className={isConflict ? 'animate-conflict-pulse' : ''} opacity={!isConnected && !isConflict ? 0.4 : 1} />
      <text x="180" y="229" textAnchor="middle" fill={isConflict ? '#B91C1C' : isConnected ? '#0F0E0C' : '#9A9088'} fontSize="7" fontFamily="Space Grotesk, sans-serif" fontWeight="700">BRAVO</text>
      {isConflict && (<><rect x="153" y="242" width="54" height="11" rx="2" fill="#B91C1C" /><text x="180" y="250" textAnchor="middle" fill="white" fontSize="5.5" fontFamily="Space Grotesk, sans-serif" fontWeight="700" letterSpacing="0.1em">⚠ CONFLICT</text></>)}
      {/* Camp C */}
      <circle cx="300" cy="222" r="26" fill={isConnected ? '#F5F0E8' : '#EDE8DD'} stroke={isConnected ? '#D97706' : '#C8C0B0'} strokeWidth={1.5} opacity={!isConnected && !isConflict ? 0.4 : 1} />
      <text x="300" y="219" textAnchor="middle" fill={isConnected ? '#0F0E0C' : '#9A9088'} fontSize="7" fontFamily="Space Grotesk, sans-serif" fontWeight="700">CHARLIE</text>
      <text x="300" y="230" textAnchor="middle" fill="#D97706" fontSize="7" fontFamily="Space Grotesk, sans-serif" fontWeight="600">9h</text>
      {/* Fragmentation overlay */}
      {state === 'fragmented' && (
        <>
          <text x="180" y="140" textAnchor="middle" fill="rgba(185,28,28,0.4)" fontSize="10" fontFamily="Space Grotesk, sans-serif" fontWeight="700" letterSpacing="0.1em">NO SIGNAL</text>
          <text x="80" y="155" textAnchor="middle" fill="rgba(15,14,12,0.2)" fontSize="7" fontFamily="Space Grotesk, sans-serif">QUEUING LOCALLY</text>
          <text x="280" y="160" textAnchor="middle" fill="rgba(15,14,12,0.2)" fontSize="7" fontFamily="Space Grotesk, sans-serif">QUEUING LOCALLY</text>
        </>
      )}
      {state === 'conflict' && (
        <text x="180" y="145" textAnchor="middle" fill="rgba(185,28,28,0.5)" fontSize="8.5" fontFamily="Space Grotesk, sans-serif" fontWeight="700" letterSpacing="0.08em">800L — LOCATION UNKNOWN</text>
      )}
    </svg>
  );
}

function PhaseBlock({ phase, index }: { phase: Phase; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-20% 0px -20% 0px' });
  const isConflict = phase.networkState === 'conflict';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: isInView ? 1 : 0.25 }}
      transition={{ duration: 0.6 }}
      style={{
        display: 'grid',
        gridTemplateColumns: index % 2 === 0 ? '1fr 1fr' : '1fr 1fr',
        gap: '4rem',
        alignItems: 'center',
        padding: '6rem 0',
        borderTop: '1px solid var(--setu-dust)',
        flexDirection: index % 2 !== 0 ? 'row-reverse' : undefined,
      }}
      className="crisis-phase-grid"
    >
      {/* Text side */}
      <div style={{ order: index % 2 !== 0 ? 2 : 1 }}>
        <motion.div
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 16 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="setu-label" style={{ marginBottom: '1.5rem' }}>{phase.label}</div>
          <div
            className="setu-display-lg"
            style={{
              whiteSpace: 'pre-line',
              color: isConflict ? 'var(--setu-crisis)' : 'var(--setu-ink)',
              marginBottom: '1.5rem',
            }}
          >
            {phase.headline}
          </div>
          <p style={{ fontSize: '1rem', color: 'var(--setu-dim)', lineHeight: 1.75, maxWidth: '38ch' }}>
            {phase.subtext}
          </p>
          {isConflict && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: isInView ? 1 : 0, scale: isInView ? 1 : 0.96 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              style={{
                marginTop: '2rem',
                padding: '1rem 1.25rem',
                background: 'var(--setu-crisis-bg)',
                borderLeft: '3px solid var(--setu-crisis)',
              }}
            >
              <div className="setu-label" style={{ color: 'var(--setu-crisis)', marginBottom: '0.5rem' }}>
                CONFLICT ACTIVE
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--setu-crisis)' }}>
                DELIVERY_UNCONFIRMED
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--setu-crisis)', marginTop: '0.25rem', opacity: 0.8 }}>
                Driver claims DELIVERED — Camp Bravo reports NO RECEIPT
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Network visualization side */}
      <motion.div
        style={{ order: index % 2 !== 0 ? 1 : 2, height: '280px' }}
        animate={{ opacity: isInView ? 1 : 0.4 }}
        transition={{ duration: 0.5 }}
      >
        <NetworkState state={phase.networkState} />
      </motion.div>

      <style>{`@media (max-width: 900px) { .crisis-phase-grid { grid-template-columns: 1fr !important; } }`}</style>
    </motion.div>
  );
}

export default function CrisisSection() {
  return (
    <section id="crisis" style={{ background: 'var(--setu-paper)', padding: '0 0 4rem' }}>
      <div className="setu-container">
        <div style={{ paddingTop: '6rem', paddingBottom: '2rem' }}>
          <div className="setu-label" style={{ marginBottom: '1rem' }}>The Problem</div>
          <div className="setu-display-md" style={{ maxWidth: '20ch' }}>
            What happens when the network fails mid-operation.
          </div>
        </div>
        {PHASES.map((phase, i) => (
          <PhaseBlock key={phase.id} phase={phase} index={i} />
        ))}
      </div>
    </section>
  );
}
