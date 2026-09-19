'use client';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const STATES = [
  {
    num: '01',
    label: 'OFFLINE',
    desc: 'Network drops. Field devices lose connectivity.',
    detail: 'Events are immediately written to the local IndexedDB queue. No data is discarded. The operator continues working.',
    color: 'var(--setu-ash)',
    textColor: 'var(--setu-dim)',
  },
  {
    num: '02',
    label: 'QUEUED',
    desc: '3 events pending in local queue.',
    detail: 'STOCK_UPDATE, REQUEST_SUBMITTED, ROUTE_STATUS_UPDATED — stored in IndexedDB, ready to transmit.',
    color: 'var(--setu-dust)',
    textColor: 'var(--setu-dim)',
  },
  {
    num: '03',
    label: 'SYNCING',
    desc: 'Connectivity restored. Flushing queue.',
    detail: 'Events transmit one-by-one to the API. Each successful POST removes the event from the local store.',
    color: 'var(--setu-amber)',
    textColor: 'var(--setu-amber)',
  },
  {
    num: '04',
    label: 'RECONCILING',
    desc: 'Conflict detection running.',
    detail: 'SETU detects DELIVERY_UNCONFIRMED: driver marked route DELIVERED but no camp confirmation received. 800L disputed.',
    color: 'var(--setu-crisis)',
    textColor: 'var(--setu-crisis)',
  },
  {
    num: '05',
    label: 'RESOLVED',
    desc: 'Redistribution complete. State reconciled.',
    detail: '4,000L allocated: Camp Alpha 2,000L (4h window), Camp Charlie 1,200L (9h window). Camp Bravo shortage flagged active.',
    color: 'var(--setu-verified)',
    textColor: 'var(--setu-verified)',
  },
];

function StateRow({ state, index }: { state: typeof STATES[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: '-15% 0px -15% 0px' });

  return (
    <motion.div
      ref={ref}
      animate={{ opacity: isInView ? 1 : 0.2 }}
      transition={{ duration: 0.5 }}
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 1fr 1fr',
        gap: '2rem 4rem',
        alignItems: 'start',
        padding: '3rem 0',
        borderTop: '1px solid var(--setu-dust)',
        position: 'relative',
      }}
      className="reconcile-row"
    >
      {/* Number */}
      <div style={{ position: 'relative' }}>
        <motion.div
          animate={{
            color: isInView ? state.color : 'var(--setu-dust)',
          }}
          transition={{ duration: 0.4 }}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '3.5rem',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.03em',
          }}
        >
          {state.num}
        </motion.div>
        {/* Vertical connector */}
        {index < STATES.length - 1 && (
          <motion.div
            animate={{ background: isInView ? state.color : 'var(--setu-dust)' }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'absolute',
              left: '50%',
              top: '100%',
              width: '1px',
              height: '3rem',
              marginTop: '0.5rem',
              opacity: 0.4,
            }}
          />
        )}
      </div>

      {/* Label + description */}
      <div>
        <motion.div
          animate={{ color: isInView ? state.textColor : 'var(--setu-dust)' }}
          transition={{ duration: 0.4 }}
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '0.625rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
          }}
        >
          {state.label}
        </motion.div>
        <div
          className="setu-display-md"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 3rem)', marginBottom: '0.75rem' }}
        >
          {state.desc}
        </div>
      </div>

      {/* Detail text */}
      <motion.p
        animate={{ opacity: isInView ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        style={{
          fontSize: '0.9rem',
          color: 'var(--setu-dim)',
          lineHeight: 1.75,
          paddingTop: '3.5rem',
        }}
      >
        {state.detail}
      </motion.p>

      <style>{`@media (max-width: 900px) { .reconcile-row { grid-template-columns: 60px 1fr !important; } .reconcile-row > *:last-child { grid-column: 2; padding-top: 0 !important; } }`}</style>
    </motion.div>
  );
}

export default function ReconcileSection() {
  return (
    <section
      id="reconcile"
      style={{ background: 'var(--setu-ink)', color: 'var(--setu-paper)', padding: '0 0 8rem' }}
    >
      <div className="setu-container">
        <div style={{ padding: '8rem 0 4rem' }}>
          <div
            className="setu-label"
            style={{ color: 'var(--setu-ash)', marginBottom: '1.5rem' }}
          >
            How SETU Responds
          </div>
          <div
            className="setu-display-lg"
            style={{ color: 'var(--setu-paper)', maxWidth: '20ch', lineHeight: 1.0 }}
          >
            From breakdown
            <span style={{ fontStyle: 'italic', color: 'var(--setu-amber)' }}> to resolution</span>.
          </div>
        </div>

        {STATES.map((state, i) => (
          <StateRow key={state.num} state={state} index={i} />
        ))}
      </div>
    </section>
  );
}
