'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

const ROLES = [
  {
    href: '/command',
    role: 'COORDINATOR',
    title: 'Command Centre',
    desc: 'Resolve conflicts. Trigger redistribution. View AI explanations. Monitor all field events in real-time.',
    badge: 'PRIMARY',
    accent: 'var(--setu-ink)',
  },
  {
    href: '/field?role=camp',
    role: 'CAMP OFFICER',
    title: 'Camp Terminal',
    desc: 'Report stock levels. Confirm or deny deliveries. Submit emergency requests.',
    badge: null,
    accent: 'var(--setu-dim)',
  },
  {
    href: '/field?role=warehouse',
    role: 'WAREHOUSE',
    title: 'Warehouse Terminal',
    desc: 'Record supply dispatches. Manage outbound inventory.',
    badge: null,
    accent: 'var(--setu-dim)',
  },
  {
    href: '/field?role=driver',
    role: 'DRIVER',
    title: 'Route Terminal',
    desc: 'Update route status. Mark deliveries. Report diversions or delays.',
    badge: null,
    accent: 'var(--setu-dim)',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] as [number,number,number,number] } },
};

export default function CtaSection() {
  return (
    <section
      id="enter"
      style={{ background: 'var(--setu-paper)', padding: '10rem 0 8rem', borderTop: '1px solid var(--setu-dust)' }}
    >
      <div className="setu-container">
        {/* Main CTA headline */}
        <div style={{ marginBottom: '6rem' }}>
          <div className="setu-label" style={{ marginBottom: '1.5rem' }}>
            Ready to respond
          </div>
          <div
            className="setu-display-xl"
            style={{ lineHeight: 0.9, marginBottom: '2rem' }}
          >
            ENTER THE
            <span
              style={{
                fontStyle: 'italic',
                color: 'var(--setu-amber)',
                display: 'block',
              }}
            >
              CRISIS.
            </span>
          </div>
          <p style={{ fontSize: '1rem', color: 'var(--setu-dim)', lineHeight: 1.75, maxWidth: '44ch' }}>
            Select your role. Every terminal is connected to the same
            reconciliation layer. Every event you submit flows through the
            full SETU pipeline — offline queue → sync → conflict detection → redistribution.
          </p>
        </div>

        {/* Role selection */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-10%' }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1px',
            background: 'var(--setu-dust)',
            border: '1px solid var(--setu-dust)',
          }}
        >
          {ROLES.map((r) => (
            <motion.div key={r.href} variants={itemVariants}>
              <Link href={r.href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                <div
                  style={{
                    background: 'var(--setu-paper)',
                    padding: '2.5rem',
                    height: '100%',
                    transition: 'background 200ms ease',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--setu-bone)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--setu-paper)';
                  }}
                >
                  {r.badge && (
                    <div
                      className="setu-label"
                      style={{
                        color: 'var(--setu-paper)',
                        background: 'var(--setu-ink)',
                        display: 'inline-block',
                        padding: '0.15rem 0.5rem',
                        marginBottom: '1.5rem',
                        fontSize: '0.55rem',
                      }}
                    >
                      {r.badge}
                    </div>
                  )}
                  {!r.badge && <div style={{ height: '1.75rem', marginBottom: '1.5rem' }} />}

                  <div
                    className="setu-label"
                    style={{ color: r.accent, marginBottom: '0.75rem' }}
                  >
                    {r.role}
                  </div>

                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '1.4rem',
                      letterSpacing: '-0.02em',
                      marginBottom: '1rem',
                      color: 'var(--setu-ink)',
                    }}
                  >
                    {r.title}
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--setu-dim)', lineHeight: 1.65 }}>
                    {r.desc}
                  </p>

                  <div
                    style={{
                      marginTop: '2rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: 'var(--setu-ink)',
                    }}
                  >
                    <span className="setu-label" style={{ color: 'var(--setu-ink)' }}>
                      Enter terminal
                    </span>
                    <span style={{ fontSize: '0.8rem' }}>→</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer note */}
        <div
          style={{
            marginTop: '4rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--setu-dust)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div className="setu-label">
            Built on AWS — DynamoDB · Lambda · EventBridge · Step Functions · Bedrock
          </div>
          <div className="setu-label" style={{ color: 'var(--setu-dim)' }}>
            SETU / Crisis Logistics Grid / 2024
          </div>
        </div>
      </div>
    </section>
  );
}
