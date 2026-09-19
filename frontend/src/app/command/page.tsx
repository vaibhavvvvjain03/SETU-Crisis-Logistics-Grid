'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useDemoState } from '@/lib/DemoState';
import { Conflict, Recommendation, Event, LocationProfile } from '@setu/shared';
import LogisticsNetwork from '@/components/command/LogisticsNetwork';

type NavSection = 'overview' | 'incidents' | 'camps' | 'warehouses' | 'drivers' | 'supply' | 'events' | 'decisions' | 'system' | 'guide';

export default function CommandCentre() {
  const router = useRouter();
  const [active, setActive] = useState<NavSection>('overview');
  const { conflicts, events, networkStatus } = useDemoState();

  const handleSignOut = async () => {
    const { signOut } = await import('@/lib/auth');
    await signOut();
    router.push('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--setu-paper)', color: 'var(--setu-ink)' }}>
      <Sidebar active={active} onNav={setActive} conflictCount={conflicts.length} onSignOut={handleSignOut} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {active === 'overview' && <OverviewPanel />}
        {active === 'incidents' && <IncidentsPanel />}
        {active === 'camps' && <CampsPanel />}
        {active === 'warehouses' && <WarehousesPanel />}
        {active === 'drivers' && <DriversPanel />}
        {active === 'supply' && <SupplyPanel />}
        {active === 'events' && <EventsPanel />}
        {active === 'decisions' && <DecisionsPanel />}
        {active === 'system' && <SystemPanel />}
        {active === 'guide' && <GuidePanel />}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
function Sidebar({ active, onNav, conflictCount, onSignOut }: { active: NavSection, onNav: (s: NavSection) => void, conflictCount: number, onSignOut: () => void }) {
  const items: { id: NavSection; label: string; icon: string }[] = [
    { id: 'overview',  label: 'Overview',     icon: '◈' },
    { id: 'incidents', label: 'Incidents',     icon: '⚠' },
    { id: 'camps',     label: 'Camps',         icon: '⬡' },
    { id: 'warehouses',label: 'Warehouses',    icon: '⬚' },
    { id: 'drivers',   label: 'Drivers',       icon: '⛟' },
    { id: 'supply',    label: 'Supply',        icon: '▤' },
    { id: 'events',    label: 'Event Stream',  icon: '≡' },
    { id: 'decisions', label: 'Decisions',     icon: '⇌' },
    { id: 'system',    label: 'System',        icon: '⬗' },
    { id: 'guide',     label: 'How It Works',  icon: '?' },
  ];

  return (
    <nav style={{
      width: '20%',
      minWidth: '220px',
      flexShrink: 0,
      background: 'var(--setu-paper)',
      borderRight: '1px solid var(--setu-dust)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--setu-dust)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.2rem', color: 'var(--setu-ink)', letterSpacing: '-0.03em' }}>SETU</div>
        <div style={{ fontSize: '0.65rem', color: 'var(--setu-dim)', fontWeight: 600, letterSpacing: '0.08em', marginTop: '0.2rem' }}>COMMAND CENTRE</div>
      </div>

      <div style={{ flex: 1, padding: '0.5rem 0', overflowY: 'auto' }}>
        {items.map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '0.75rem 1.25rem',
                background: isActive ? 'var(--setu-bone)' : 'transparent',
                border: 'none', borderLeft: isActive ? '3px solid var(--setu-ink)' : '3px solid transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'all 150ms',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: isActive ? 'var(--setu-ink)' : 'var(--setu-ash)', width: '16px' }}>{item.icon}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--setu-ink)' : 'var(--setu-dim)' }}>
                  {item.label}
                </span>
              </div>
              {item.id === 'incidents' && conflictCount > 0 && (
                <span style={{ background: 'var(--setu-crisis)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '2px' }}>
                  {conflictCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '1rem', borderTop: '1px solid var(--setu-dust)' }}>
        <button onClick={onSignOut} style={{ width: '100%', padding: '0.5rem', background: 'transparent', border: '1px solid var(--setu-dust)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--setu-dim)', cursor: 'pointer' }}>
          SIGN OUT
        </button>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Overview Panel
// ---------------------------------------------------------------------------
function OverviewPanel() {
  const { locations, inventory, conflicts, events, recommendations, networkStatus } = useDemoState();
  
  const criticalCamps = inventory.filter(s => {
    const p = locations.find(l => l.locationId === s.locationId);
    if (!p) return false;
    const rate = p.consumptionRatePerHour || 1;
    return (s.confirmedQuantity / rate) < 6;
  }).length;
  
  const activeRequests = events.filter(e => e.eventType === 'REQUEST_SUBMITTED').length;
  const offlineTerminals = networkStatus === 'OFFLINE' ? 1 : 0;
  const latestDecision = recommendations.length > 0 ? recommendations[recommendations.length - 1] : null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid var(--setu-dust)', flexShrink: 0 }}>
        <StatBox label="CRITICAL SHORTAGES" value={criticalCamps} color="var(--setu-crisis)" />
        <StatBox label="OFFLINE TERMINALS" value={offlineTerminals} color="var(--setu-high)" />
        <StatBox label="ACTIVE REQUESTS" value={activeRequests} color="var(--setu-ink)" />
        <StatBox label="UNRESOLVED CONFLICTS" value={conflicts.length} color={conflicts.length > 0 ? 'var(--setu-crisis)' : 'var(--setu-ink)'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', flex: 1, minHeight: 0 }}>
        <div style={{ borderRight: '1px solid var(--setu-dust)', background: 'var(--setu-bone)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10, background: 'var(--setu-paper)', padding: '0.25rem 0.5rem', border: '1px solid var(--setu-dust)', fontSize: '0.7rem', fontWeight: 700 }}>
            LIVE LOGISTICS NETWORK
          </div>
          <LogisticsNetwork inventoryState={inventory} conflicts={conflicts} locations={locations} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--setu-paper)' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--setu-dust)', background: 'var(--setu-bone)', fontWeight: 700, fontSize: '0.8rem' }}>
            INCIDENT QUEUE
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conflicts.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--setu-dim)' }}>No active incidents</div>
            ) : conflicts.map(c => (
              <div key={c.conflictId} style={{ padding: '1rem', borderBottom: '1px solid var(--setu-dust)', borderLeft: '3px solid var(--setu-crisis)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--setu-crisis)', marginBottom: '0.2rem' }}>{c.conflictType}</div>
                <div style={{ fontSize: '0.75rem' }}>{locations.find(l => l.locationId === c.locationId)?.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: '30%', borderTop: '1px solid var(--setu-dust)', display: 'grid', gridTemplateColumns: '1fr 1fr', flexShrink: 0 }}>
        <div style={{ borderRight: '1px solid var(--setu-dust)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--setu-dust)', background: 'var(--setu-bone)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>LIVE EVENT STREAM</span>
            <span style={{ color: networkStatus === 'ONLINE' || networkStatus === 'RECONCILED' ? 'var(--setu-verified)' : 'var(--setu-high)' }}>● {networkStatus}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1rem' }}>
            {events.slice(0, 5).map(e => (
              <div key={e.eventId} style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', marginBottom: '0.5rem', fontFamily: 'Courier New, monospace' }}>
                <span style={{ color: 'var(--setu-dim)' }}>{new Date(e.timestamp).toLocaleTimeString()}</span>
                <span>{locations.find(l=>l.locationId === e.locationId)?.name || 'SETU'}</span>
                <span style={{ color: 'var(--setu-ink)', fontWeight: 600 }}>{e.eventType.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--setu-bone)' }}>
           <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--setu-dust)', fontWeight: 700, fontSize: '0.8rem' }}>LATEST DECISION</div>
           <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
             {latestDecision ? (
               <div>
                 <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--setu-ink)' }}>ALLOCATED: {latestDecision.supplyQuantity}L</div>
                 <div style={{ fontSize: '0.75rem', color: 'var(--setu-dim)', marginBottom: '1rem' }}>{latestDecision.reason}</div>
                 <div style={{ padding: '0.5rem', background: 'var(--setu-paper)', border: '1px solid var(--setu-dust)', fontSize: '0.7rem', fontFamily: 'Courier New, monospace' }}>
                   {Object.entries(latestDecision.destinations).map(([loc, qty]) => (
                     <div key={loc}>{locations.find(l => l.locationId === loc)?.name}: {qty as number}L</div>
                   ))}
                 </div>
               </div>
             ) : (
               <div style={{ color: 'var(--setu-dim)', fontSize: '0.8rem' }}>No recent automated decisions.</div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <div style={{ padding: '1rem 1.5rem', borderRight: '1px solid var(--setu-dust)' }}>
      <div className="setu-label">{label}</div>
      <div style={{ fontFamily: 'Courier New, monospace', fontSize: '2rem', fontWeight: 700, color, marginTop: '0.2rem', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Other Panels (Placeholder replacements to use DemoContext)
// ---------------------------------------------------------------------------
function CampsPanel() {
  const { locations, inventory } = useDemoState();
  const camps = locations.filter(l => l.type === 'CAMP');
  return (
    <div style={{ padding: '2rem' }}>
      <h2 className="setu-display-md" style={{ marginBottom: '2rem' }}>Camps</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {camps.map(camp => {
          const inv = inventory.find(i => i.locationId === camp.locationId);
          return (
            <div key={camp.locationId} style={{ border: '1px solid var(--setu-dust)', padding: '1.5rem', background: 'var(--setu-bone)' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '1rem' }}>{camp.name}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--setu-dim)' }}>Population:</span>
                <span style={{ fontWeight: 700 }}>{camp.population}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--setu-dim)' }}>Water Supply:</span>
                <span style={{ fontWeight: 700 }}>{inv?.confirmedQuantity} L</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WarehousesPanel() {
  const { locations, inventory } = useDemoState();
  const warehouses = locations.filter(l => l.type === 'WAREHOUSE');
  return (
    <div style={{ padding: '2rem' }}>
      <h2 className="setu-display-md" style={{ marginBottom: '2rem' }}>Warehouses</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {warehouses.map(wh => {
          const inv = inventory.find(i => i.locationId === wh.locationId);
          return (
            <div key={wh.locationId} style={{ border: '1px solid var(--setu-dust)', padding: '1.5rem', background: 'var(--setu-bone)' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '1rem' }}>{wh.name}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--setu-dim)' }}>Available Capacity:</span>
                <span style={{ fontWeight: 700 }}>{inv?.confirmedQuantity} L</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DriversPanel() {
  const { drivers } = useDemoState();
  return (
    <div style={{ padding: '2rem' }}>
      <h2 className="setu-display-md" style={{ marginBottom: '2rem' }}>Drivers</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--setu-ink)', textAlign: 'left' }}>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>DRIVER</th>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>VEHICLE</th>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>ROUTE</th>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>PAYLOAD</th>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>ETA</th>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map(d => (
            <tr key={d.id} style={{ borderBottom: '1px solid var(--setu-dust)' }}>
              <td style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>{d.name}</td>
              <td style={{ padding: '1rem 0.5rem', color: 'var(--setu-dim)' }}>{d.vehicle}</td>
              <td style={{ padding: '1rem 0.5rem' }}>{d.assignedRoute?.from} → {d.assignedRoute?.to}</td>
              <td style={{ padding: '1rem 0.5rem', fontFamily: 'Courier New' }}>{d.payload?.quantity}L {d.payload?.item}</td>
              <td style={{ padding: '1rem 0.5rem' }}>{d.eta}</td>
              <td style={{ padding: '1rem 0.5rem' }}>
                <span style={{ padding: '0.2rem 0.5rem', background: 'var(--setu-bone)', border: '1px solid var(--setu-dust)', fontSize: '0.7rem', fontWeight: 700 }}>{d.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SupplyPanel() {
  const { events, locations } = useDemoState();
  const requests = events.filter(e => e.eventType === 'REQUEST_SUBMITTED');
  return (
    <div style={{ padding: '2rem' }}>
      <h2 className="setu-display-md" style={{ marginBottom: '2rem' }}>Supply Requests</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--setu-ink)', textAlign: 'left' }}>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>TIME</th>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>SOURCE</th>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>QUANTITY</th>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(r => (
            <tr key={r.eventId} style={{ borderBottom: '1px solid var(--setu-dust)' }}>
              <td style={{ padding: '1rem 0.5rem', fontFamily: 'Courier New' }}>{new Date(r.timestamp).toLocaleString()}</td>
              <td style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>{locations.find(l => l.locationId === r.locationId)?.name}</td>
              <td style={{ padding: '1rem 0.5rem' }}>{r.payload.quantity} {r.payload.item}</td>
              <td style={{ padding: '1rem 0.5rem', color: 'var(--setu-high)', fontWeight: 700 }}>PENDING</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IncidentsPanel() {
  const { conflicts, locations } = useDemoState();
  return (
    <div style={{ padding: '2rem' }}>
      <h2 className="setu-display-md" style={{ marginBottom: '2rem' }}>Incidents</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--setu-ink)', textAlign: 'left' }}>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>TIME</th>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>LOCATION</th>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>TYPE</th>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>SEVERITY</th>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {conflicts.map(c => (
            <tr key={c.conflictId} style={{ borderBottom: '1px solid var(--setu-dust)' }}>
              <td style={{ padding: '1rem 0.5rem', fontFamily: 'Courier New' }}>{c.detectedAt ? new Date(c.detectedAt).toLocaleTimeString() : 'Unknown'}</td>
              <td style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>{locations.find(l => l.locationId === c.locationId)?.name}</td>
              <td style={{ padding: '1rem 0.5rem', color: 'var(--setu-crisis)' }}>{c.conflictType.replace('_', ' ')}</td>
              <td style={{ padding: '1rem 0.5rem' }}><span className={c.severity === 'CRITICAL' ? 'setu-badge-critical' : 'setu-badge-high'}>{c.severity}</span></td>
              <td style={{ padding: '1rem 0.5rem' }}><button style={{ padding: '0.3rem 0.8rem', background: 'var(--setu-ink)', color: 'var(--setu-paper)', border: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>RESOLVE</button></td>
            </tr>
          ))}
          {conflicts.length === 0 && <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--setu-dim)' }}>No active incidents.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function EventsPanel() {
  const { events, locations } = useDemoState();
  return (
    <div style={{ padding: '2rem' }}>
      <h2 className="setu-display-md" style={{ marginBottom: '2rem' }}>Event Stream</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--setu-ink)', textAlign: 'left' }}>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>TIME</th>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>LOCATION</th>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>EVENT</th>
            <th style={{ padding: '1rem 0.5rem', fontSize: '0.8rem' }}>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {events.map(e => (
            <tr key={e.eventId} style={{ borderBottom: '1px solid var(--setu-dust)' }}>
              <td style={{ padding: '1rem 0.5rem', fontFamily: 'Courier New' }}>{new Date(e.timestamp).toLocaleTimeString()}</td>
              <td style={{ padding: '1rem 0.5rem', fontWeight: 700 }}>{locations.find(l => l.locationId === e.locationId)?.name || 'SETU'}</td>
              <td style={{ padding: '1rem 0.5rem' }}>{e.eventType.replace('_', ' ')}</td>
              <td style={{ padding: '1rem 0.5rem' }}><span style={{ padding: '0.2rem 0.5rem', background: 'var(--setu-verified-bg)', color: 'var(--setu-verified)', fontSize: '0.7rem', fontWeight: 700 }}>{e.syncStatus}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DecisionsPanel() {
  const { recommendations, getExplainedDecision, locations } = useDemoState();
  return (
    <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <h2 className="setu-display-md" style={{ marginBottom: '2rem' }}>Decisions</h2>
      {recommendations.length === 0 ? (
        <div style={{ color: 'var(--setu-dim)' }}>No decisions generated yet.</div>
      ) : recommendations.map(rec => (
        <div key={rec.recommendationId} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--setu-dust)', paddingBottom: '2rem' }}>
          <div>
            <div className="setu-label" style={{ marginBottom: '1rem' }}>DECISION ENGINE (DETERMINISTIC)</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>DECISION #{rec.recommendationId.substring(0, 8).toUpperCase()}</div>
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--setu-bone)', border: '1px solid var(--setu-dust)' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>ALLOCATION</div>
              {Object.entries(rec.destinations).map(([loc, qty]) => (
                <div key={loc} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', fontFamily: 'Courier New' }}>
                  <span>{locations.find(l => l.locationId === loc)?.name}</span>
                  <span style={{ fontWeight: 700 }}>{qty as number} L</span>
                </div>
              ))}
            </div>
            <div style={{ color: 'var(--setu-verified)', fontWeight: 700, fontSize: '0.8rem' }}>✓ Survival priority<br/>✓ Available inventory<br/>✓ 24h safety threshold<br/>✓ Conflict resolved</div>
          </div>
          <div>
            <div className="setu-label" style={{ marginBottom: '1rem', color: 'var(--setu-amber)' }}>EXPLANATION (BEDROCK)</div>
            <div style={{ padding: '1.5rem', background: 'var(--setu-paper)', border: '1px solid var(--setu-amber)', fontFamily: 'Courier New, monospace', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--setu-ink)' }}>
              {getExplainedDecision(rec.recommendationId)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SystemPanel() {
  const { networkStatus, offlineQueue } = useDemoState();
  return (
    <div style={{ padding: '2rem' }}>
      <h2 className="setu-display-md" style={{ marginBottom: '2rem' }}>System</h2>
      <div style={{ border: '1px solid var(--setu-dust)', padding: '2rem', background: 'var(--setu-bone)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--setu-dust)', paddingBottom: '1rem' }}>
          <span style={{ fontWeight: 700 }}>Network Status</span>
          <span style={{ color: networkStatus === 'ONLINE' || networkStatus === 'RECONCILED' ? 'var(--setu-verified)' : 'var(--setu-high)', fontWeight: 700 }}>{networkStatus}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700 }}>Offline Queue</span>
          <span style={{ fontFamily: 'Courier New', fontWeight: 700 }}>{offlineQueue.length} Events</span>
        </div>
      </div>
    </div>
  );
}

function GuidePanel() {
  return (
    <div style={{ padding: '2rem', overflowY: 'auto', height: '100%' }}>
      <h2 className="setu-display-md" style={{ marginBottom: '1rem' }}>How SETU Works</h2>
      <p style={{ color: 'var(--setu-dim)', marginBottom: '2rem', maxWidth: '600px' }}>
        SETU is designed to handle poor connectivity scenarios gracefully. Here is how you can test the end-to-end functionality of the platform using the local simulation.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
        
        <div style={{ padding: '1.5rem', background: 'var(--setu-bone)', border: '1px solid var(--setu-dust)' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--setu-ink)' }}>1. Setup the Split View</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--setu-dim)' }}>
            Open the <strong>Field Terminal</strong> in a separate browser tab by clicking the "Field Terminal" link on the Landing page, or navigating to <code style={{background:'rgba(0,0,0,0.05)', padding:'2px 4px'}}>/field</code>. Keep this Command Centre tab open.
          </p>
        </div>

        <div style={{ padding: '1.5rem', background: 'var(--setu-bone)', border: '1px solid var(--setu-dust)' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--setu-ink)' }}>2. Simulate Disconnect</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--setu-dim)' }}>
            In the Field Terminal tab, click the <strong>SIMULATE DISCONNECT</strong> button. The terminal will switch to Local Mode. Notice that the Command Centre tab is unaffected and remains ONLINE.
          </p>
        </div>

        <div style={{ padding: '1.5rem', background: 'var(--setu-bone)', border: '1px solid var(--setu-dust)' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--setu-ink)' }}>3. Submit an Event Offline</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--setu-dim)' }}>
            Submit a "Request Supply" event from Camp Alpha for 2000L. It will instantly say <strong>OFFLINE — event saved to local queue.</strong>
          </p>
        </div>

        <div style={{ padding: '1.5rem', background: 'var(--setu-bone)', border: '1px solid var(--setu-dust)' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--setu-ink)' }}>4. Verify Isolation</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--setu-dim)' }}>
            Check the Command Centre tab. You will see that the new event has <strong>not</strong> appeared in the Event Stream or Incident Queue, proving the offline isolation works.
          </p>
        </div>

        <div style={{ padding: '1.5rem', background: 'var(--setu-bone)', border: '1px solid var(--setu-dust)' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--setu-ink)' }}>5. Reconnect & Reconcile</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--setu-dim)' }}>
            In the Field Terminal, click <strong>RECONNECT</strong>. Watch the status switch to SYNCING and then RECONCILED. Switch back to the Command Centre to see the event instantly appear in the Event Stream.
          </p>
        </div>

        <div style={{ padding: '1.5rem', background: 'var(--setu-bone)', border: '1px solid var(--setu-dust)' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--setu-ink)' }}>6. View Decisions & Conflicts</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--setu-dim)' }}>
            If the synced event caused a duplicate request or stock mismatch, check the <strong>Incidents</strong> tab. Check the <strong>Decisions</strong> tab to see how the system deterministically reallocated supplies based on survival windows.
          </p>
        </div>

      </div>
    </div>
  );
}
