'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useAnimationFrame, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// Network SVG
// ---------------------------------------------------------------------------
interface NetworkNode {
  id: string;
  x: number;
  y: number;
  label: string;
  type: 'camp' | 'warehouse' | 'hub';
  critical?: boolean;
}

interface NetworkEdge {
  from: string;
  to: string;
}

const NODES: NetworkNode[] = [
  { id: 'WH-1',  x: 200, y: 150,  label: 'Warehouse One',  type: 'warehouse' },
  { id: 'WH-2',  x: 800, y: 150,  label: 'Warehouse Two',  type: 'warehouse' },
  { id: 'A',   x: 200, y: 350, label: 'Camp Alpha',     type: 'camp', critical: true },
  { id: 'B',   x: 500, y: 350, label: 'Camp Bravo',     type: 'camp' },
  { id: 'C',   x: 800, y: 350, label: 'Camp Charlie',   type: 'camp', critical: true },
  { id: 'CMD', x: 500, y: 200, label: 'Command',        type: 'hub' },
];

const EDGES: NetworkEdge[] = [
  { from: 'WH-1',  to: 'CMD' },
  { from: 'WH-2',  to: 'CMD' },
  { from: 'CMD', to: 'A' },
  { from: 'CMD', to: 'B' },
  { from: 'CMD', to: 'C' },
  { from: 'WH-1',  to: 'A' },
  { from: 'WH-2',  to: 'B' },
  { from: 'WH-2',  to: 'C' },
];

function getNodeById(id: string) {
  return NODES.find(n => n.id === id)!;
}

function EdgePulse({ edge, delay, broken, isEntering }: { edge: NetworkEdge; delay: number; broken: boolean; isEntering: boolean }) {
  const from = getNodeById(edge.from);
  const to = getNodeById(edge.to);
  const x = useRef(from.x);
  const y = useRef(from.y);
  const [pos, setPos] = useState({ x: from.x, y: from.y });
  const startTime = useRef<number | null>(null);
  const DURATION = 2200 + delay * 200;

  useAnimationFrame((time) => {
    if (broken && !isEntering) return;
    if (startTime.current === null) startTime.current = time - delay * 100;
    const elapsed = (time - startTime.current) % DURATION;
    const t = elapsed / DURATION;
    x.current = from.x + (to.x - from.x) * t;
    y.current = from.y + (to.y - from.y) * t;
    setPos({ x: x.current, y: y.current });
  });

  if (broken && !isEntering) return null;
  return (
    <circle cx={pos.x} cy={pos.y} r={3} fill="var(--setu-ink)" opacity={isEntering ? 1 : 0.5} />
  );
}

function NetworkViz({ phase, isEntering }: { phase: string; isEntering: boolean }) {
  const broken = phase === 'crisis';
  return (
    <motion.svg 
      viewBox="0 0 1000 500" 
      style={{ width: '100%', height: '100%' }}
      animate={isEntering ? { scale: 1.1, opacity: 0.8 } : { scale: 1, opacity: 1 }}
      transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(15,14,12,0.05)" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {EDGES.map((edge, i) => {
        const from = getNodeById(edge.from);
        const to = getNodeById(edge.to);
        const isBrokenEdge = broken && (edge.to === 'A' || edge.from === 'A');
        return (
          <motion.line
            key={i}
            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke={isBrokenEdge ? 'rgba(185,28,28,0.3)' : 'rgba(15,14,12,0.15)'}
            strokeWidth={1}
            strokeDasharray={isBrokenEdge ? '4 4' : 'none'}
            animate={{ stroke: isBrokenEdge ? 'rgba(185,28,28,0.3)' : 'rgba(15,14,12,0.15)' }}
            transition={{ duration: 0.5 }}
          />
        );
      })}

      {!broken && EDGES.map((edge, i) => (
        <EdgePulse key={`pulse-${i}`} edge={edge} delay={i * 0.5} broken={broken} isEntering={isEntering} />
      ))}
      
      {isEntering && EDGES.filter(e => e.to === 'A').map((edge, i) => (
        <EdgePulse key={`entering-pulse-${i}`} edge={edge} delay={i * 0.1} broken={false} isEntering={true} />
      ))}

      {NODES.map(node => {
        const isOffline = broken && node.id === 'A';
        return (
          <g key={node.id}>
            <motion.circle
              cx={node.x} cy={node.y} r={node.type === 'hub' ? 12 : 8}
              fill={isOffline ? 'rgba(185,28,28,0.3)' : node.type === 'hub' ? 'rgba(15,14,12,0.15)' : 'rgba(15,14,12,0.1)'}
              stroke={isOffline ? '#B91C1C' : node.type === 'warehouse' ? 'rgba(15,14,12,0.6)' : 'rgba(15,14,12,0.3)'}
              strokeWidth={isOffline ? 2 : 1}
              animate={{
                fill: isOffline ? 'rgba(185,28,28,0.3)' : node.type === 'hub' ? 'rgba(15,14,12,0.15)' : 'rgba(15,14,12,0.1)',
                stroke: isOffline ? '#B91C1C' : node.type === 'warehouse' ? 'rgba(15,14,12,0.6)' : 'rgba(15,14,12,0.3)',
              }}
              transition={{ duration: 0.4 }}
            />
            {isOffline && !isEntering && (
              <motion.circle
                cx={node.x} cy={node.y} r={16}
                fill="none"
                stroke="rgba(185,28,28,0.4)"
                strokeWidth={1}
                animate={{ r: [12, 24], opacity: [0.8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
            <text
              x={node.x} y={node.y + 20}
              textAnchor="middle"
              fontSize={10}
              fill={isOffline ? '#B91C1C' : 'rgba(15,14,12,0.8)'}
              fontFamily="var(--font-ui)"
              fontWeight="600"
              letterSpacing="0.04em"
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </motion.svg>
  );
}

export default function LandingHero() {
  const router = useRouter();
  const [phase, setPhase] = useState<'stable' | 'crisis' | 'recovery' | 'reconciled'>('stable');
  const [isEntering, setIsEntering] = useState(false);

  const handleEnter = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isEntering) return;
    setIsEntering(true);
    
    // Sequence
    setPhase('stable');
    setTimeout(() => setPhase('crisis'), 300); // 1. Connection lost
    setTimeout(() => setPhase('recovery'), 900); // 2. Syncing
    setTimeout(() => setPhase('reconciled'), 1400); // 3. Reconciled
    
    setTimeout(() => {
      router.push('/login');
    }, 1800);
  };

  const getEventText = () => {
    switch (phase) {
      case 'crisis': return 'REQUEST STORED LOCALLY';
      case 'recovery': return 'SYNCING';
      case 'reconciled': return 'RECONCILED';
      default: return 'SYSTEM ONLINE';
    }
  };

  const getEventColor = () => {
    switch (phase) {
      case 'crisis': return 'var(--setu-crisis)';
      case 'recovery': return 'var(--setu-amber)';
      case 'reconciled': return 'var(--setu-verified)';
      default: return 'var(--setu-dim)';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--setu-paper)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-ui)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <AnimatePresence>
        {!isEntering && (
          <motion.header 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              padding: '1.5rem 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--setu-dust)',
              flexShrink: 0,
              background: 'transparent',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '1.2rem',
              letterSpacing: '-0.04em',
              color: 'var(--setu-ink)',
            }}>SETU</div>
          </motion.header>
        )}
      </AnimatePresence>

      <main style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'flex-start',
        paddingTop: '6rem',
        position: 'relative', 
        zIndex: 10,
      }}>
        <AnimatePresence>
          {!isEntering && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '0 2rem',
                maxWidth: '800px',
              }}
            >
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 'clamp(3rem, 7vw, 5rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                color: 'var(--setu-ink)',
                margin: '0 0 1.5rem 0',
              }}>
                WHEN THE NETWORK BREAKS,
                <br />
                <span style={{ color: 'var(--setu-dim)' }}>RELIEF SHOULDN&apos;T.</span>
              </h1>
              
              <p style={{
                color: 'var(--setu-dim)',
                fontSize: '1.1rem',
                lineHeight: 1.6,
                marginBottom: '3rem',
                maxWidth: '600px',
              }}>
                An offline-first crisis logistics grid for coordinating relief when connectivity fails.
              </p>

              <button
                onClick={handleEnter}
                style={{
                  padding: '1.2rem 4rem',
                  background: 'var(--setu-ink)',
                  color: 'var(--setu-paper)',
                  border: '1px solid var(--setu-ink)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  letterSpacing: '0.1em',
                  transition: 'all 200ms',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--setu-ink)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--setu-ink)';
                  e.currentTarget.style.color = 'var(--setu-paper)';
                }}
              >
                ENTER SETU →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{
          width: '100%',
          maxWidth: '1200px',
          height: '500px',
          marginTop: isEntering ? '-200px' : '4rem',
          position: 'relative',
          transition: 'margin-top 1s cubic-bezier(0.22, 1, 0.36, 1)'
        }}>
          <NetworkViz phase={phase} isEntering={isEntering} />
          
          <AnimatePresence>
            {isEntering && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  position: 'absolute',
                  top: '60%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(245,240,232,0.9)',
                  padding: '0.5rem 1rem',
                  border: `1px solid ${getEventColor()}`,
                  borderRadius: '2px',
                  fontFamily: 'Courier New, monospace',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: getEventColor(),
                  zIndex: 20
                }}
              >
                {getEventText()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
