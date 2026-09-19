'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

function LogisticsNetworkHero() {
  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 600 480" className="w-full h-full" style={{ overflow: 'visible' }} aria-hidden="true">
        <defs>
          <pattern id="hero-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(15,14,12,0.04)" strokeWidth="1" />
          </pattern>
          <filter id="node-shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(15,14,12,0.12)" />
          </filter>
        </defs>
        <rect width="600" height="480" fill="url(#hero-grid)" />
        <line x1="300" y1="110" x2="120" y2="360" stroke="rgba(15,14,12,0.15)" strokeWidth="1.5" strokeDasharray="8 5" className="animate-data-flow-slow" />
        <line x1="300" y1="110" x2="300" y2="380" stroke="#B91C1C" strokeWidth="2" strokeDasharray="6 3" className="route-line-conflict" />
        <line x1="300" y1="110" x2="480" y2="360" stroke="rgba(15,14,12,0.15)" strokeWidth="1.5" strokeDasharray="8 5" className="animate-data-flow-slow" style={{ animationDelay: '0.6s' }} />
        <g filter="url(#node-shadow)">
          <rect x="255" y="70" width="90" height="50" rx="4" fill="#0F0E0C" />
          <text x="300" y="90" textAnchor="middle" fill="#F5F0E8" fontSize="9" fontFamily="Space Grotesk, sans-serif" fontWeight="600" letterSpacing="0.08em">WAREHOUSE</text>
          <text x="300" y="104" textAnchor="middle" fill="#A09890" fontSize="9" fontFamily="Space Grotesk, sans-serif">WH-1</text>
        </g>
        <g filter="url(#node-shadow)">
          <circle cx="120" cy="380" r="36" fill="#F5F0E8" stroke="#C8C0B0" strokeWidth="1.5" />
          <text x="120" y="376" textAnchor="middle" fill="#0F0E0C" fontSize="8" fontFamily="Space Grotesk, sans-serif" fontWeight="700" letterSpacing="0.06em">CAMP</text>
          <text x="120" y="389" textAnchor="middle" fill="#0F0E0C" fontSize="11" fontFamily="Space Grotesk, sans-serif" fontWeight="700">ALPHA</text>
          <text x="120" y="422" textAnchor="middle" fill="#B91C1C" fontSize="7.5" fontFamily="Space Grotesk, sans-serif" fontWeight="600">4h CRITICAL</text>
        </g>
        <g filter="url(#node-shadow)">
          <circle cx="300" cy="400" r="36" fill="#FEF2F2" stroke="#B91C1C" strokeWidth="2" className="animate-conflict-pulse" />
          <text x="300" y="396" textAnchor="middle" fill="#B91C1C" fontSize="8" fontFamily="Space Grotesk, sans-serif" fontWeight="700" letterSpacing="0.06em">CAMP</text>
          <text x="300" y="409" textAnchor="middle" fill="#B91C1C" fontSize="11" fontFamily="Space Grotesk, sans-serif" fontWeight="700">BRAVO</text>
          <rect x="270" y="420" width="60" height="14" rx="2" fill="#B91C1C" />
          <text x="300" y="430" textAnchor="middle" fill="white" fontSize="6.5" fontFamily="Space Grotesk, sans-serif" fontWeight="700" letterSpacing="0.1em">CONFLICT</text>
        </g>
        <g filter="url(#node-shadow)">
          <circle cx="480" cy="380" r="36" fill="#F5F0E8" stroke="#D97706" strokeWidth="1.5" />
          <text x="480" y="376" textAnchor="middle" fill="#0F0E0C" fontSize="8" fontFamily="Space Grotesk, sans-serif" fontWeight="700" letterSpacing="0.06em">CAMP</text>
          <text x="480" y="389" textAnchor="middle" fill="#0F0E0C" fontSize="11" fontFamily="Space Grotesk, sans-serif" fontWeight="700">CHARLIE</text>
          <text x="480" y="422" textAnchor="middle" fill="#D97706" fontSize="7.5" fontFamily="Space Grotesk, sans-serif" fontWeight="600">9h HIGH</text>
        </g>
        <circle cx="0" cy="0" r="4" fill="#E8602A" opacity="0.8">
          <animateMotion dur="3s" repeatCount="indefinite" begin="0s"><mpath href="#rwa" /></animateMotion>
        </circle>
        <path id="rwa" d="M 300 110 L 120 360" fill="none" />
        <circle cx="0" cy="0" r="4" fill="#E8602A" opacity="0.8">
          <animateMotion dur="3s" repeatCount="indefinite" begin="1s"><mpath href="#rwc" /></animateMotion>
        </circle>
        <path id="rwc" d="M 300 110 L 480 360" fill="none" />
        <text x="175" y="240" fill="rgba(15,14,12,0.2)" fontSize="7.5" fontFamily="Space Grotesk, sans-serif" letterSpacing="0.08em" transform="rotate(-35 175 240)">SUPPLY ROUTE</text>
        <text x="310" y="255" fill="rgba(185,28,28,0.45)" fontSize="7.5" fontFamily="Space Grotesk, sans-serif" fontWeight="600" letterSpacing="0.08em" transform="rotate(2 310 255)">UNCONFIRMED</text>
        <text x="400" y="232" fill="rgba(15,14,12,0.2)" fontSize="7.5" fontFamily="Space Grotesk, sans-serif" letterSpacing="0.08em" transform="rotate(32 400 232)">SUPPLY ROUTE</text>
      </svg>
    </div>
  );
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const lineVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.19, 1, 0.22, 1] as [number,number,number,number] } },
};
const fadeVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] });
  const networkY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);

  return (
    <section ref={containerRef} className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--setu-paper)' }} id="hero">
      <header className="relative z-20 flex items-center justify-between px-8 py-6 md:px-16">
        <div className="setu-label" style={{ color: 'var(--setu-ink)', fontWeight: 700, letterSpacing: '0.18em', fontSize: '0.8rem' }}>SETU</div>
        <div className="flex items-center gap-6">
          <span className="setu-label">Crisis Logistics Grid</span>
          <span className="flex items-center gap-2 setu-label" style={{ color: 'var(--setu-verified)' }}>
            <span className="setu-dot-live" />
            SYSTEM OPERATIONAL
          </span>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex items-center">
        <div className="setu-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }} className="hero-grid">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col">
              <motion.div variants={fadeVariants} style={{ marginBottom: '1.5rem' }}>
                <span className="setu-label">Field Operations / Crisis Response</span>
              </motion.div>

              <div className="setu-display-xl" style={{ marginBottom: '1rem' }}>
                <motion.div variants={lineVariants}>WHEN THE</motion.div>
                <motion.div variants={lineVariants} style={{ fontStyle: 'italic', color: 'var(--setu-amber)' }}>NETWORK</motion.div>
                <motion.div variants={lineVariants}>BREAKS,</motion.div>
              </div>

              <div className="setu-display-lg" style={{ fontWeight: 700, color: 'var(--setu-dim)', marginBottom: '2rem' }}>
                <motion.div variants={lineVariants}>RELIEF</motion.div>
                <motion.div variants={lineVariants}>SHOULDN&apos;T.</motion.div>
              </div>

              <motion.p variants={fadeVariants} style={{ fontSize: '1rem', color: 'var(--setu-dim)', lineHeight: 1.75, maxWidth: '38ch', marginBottom: '2.5rem' }}>
                SETU operates under zero-connectivity conditions — detecting conflicts, queueing field events in IndexedDB, and synchronizing the moment connectivity returns.
              </motion.p>

              <motion.div variants={fadeVariants} className="flex items-center gap-3">
                <div style={{ width: '32px', height: '1px', background: 'var(--setu-ash)', display: 'inline-block' }} />
                <span className="setu-label">Scroll to experience</span>
              </motion.div>
            </motion.div>

            <motion.div style={{ y: networkY }} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1] as [number,number,number,number], delay: 0.4 }} className="relative">
              <div className="absolute top-0 right-0 setu-label z-10" style={{ color: 'var(--setu-dim)' }}>LIVE LOGISTICS STATE</div>
              <div style={{ height: '480px' }}>
                <LogisticsNetworkHero />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--setu-dust)', padding: '1rem 0' }}>
        <div className="setu-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '3rem' }}>
            {[{ label: 'Locations', value: '4' }, { label: 'Conflict Types', value: '3' }, { label: 'Persistence', value: 'IndexedDB' }].map(({ label, value }) => (
              <div key={label}>
                <div className="setu-label">{label}</div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{value}</div>
              </div>
            ))}
          </div>
          <div className="setu-label" style={{ color: 'var(--setu-dim)' }}>Offline-first. Real conflicts. Real AWS.</div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
