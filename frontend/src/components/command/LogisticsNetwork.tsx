'use client';
import type { InventoryState, Conflict, LocationProfile } from '@setu/shared';

interface Props {
  inventoryState: InventoryState[];
  conflicts: Conflict[];
  locations: LocationProfile[];
  onCampClick?: (locationId: string) => void;
}

function getSeverityColor(survivalHours: number | undefined, confirmed: number) {
  if (survivalHours === undefined) return confirmed < 200 ? '#B91C1C' : '#C8C0B0';
  if (survivalHours < 6) return '#B91C1C';
  if (survivalHours < 24) return '#D97706';
  if (survivalHours < 72) return '#A09890';
  return '#2D6A4F';
}

export default function LogisticsNetwork({ inventoryState, conflicts, locations, onCampClick }: Props) {
  const locationIndex: Record<string, LocationProfile> = {};
  for (const loc of locations) locationIndex[loc.locationId] = loc;

  const camps = inventoryState.filter(s => s.locationId !== 'WH-1');
  const conflictLocations = new Set(conflicts.map(c => c.locationId).filter(Boolean));

  // Camp positions in triangle formation
  const positions = [
    { x: 120, y: 320 },  // Camp A — left
    { x: 300, y: 340 },  // Camp B — center (usually conflict)
    { x: 480, y: 320 },  // Camp C — right
  ];

  return (
    <svg viewBox="0 0 600 420" className="w-full h-full" style={{ overflow: 'visible' }} aria-label="Logistics network diagram">
      <defs>
        <pattern id="cmd-grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(15,14,12,0.035)" strokeWidth="1" />
        </pattern>
        <filter id="cmd-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(15,14,12,0.15)" />
        </filter>
        <filter id="conflict-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="rgba(185,28,28,0.4)" />
        </filter>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(15,14,12,0.2)" />
        </marker>
      </defs>

      <rect width="600" height="420" fill="url(#cmd-grid)" />

      {/* Route lines */}
      {camps.map((camp, i) => {
        const pos = positions[i] || { x: 120 + i * 180, y: 320 };
        const hasConflict = conflictLocations.has(camp.locationId);
        return (
          <line
            key={`route-${camp.locationId}`}
            x1="300" y1="95"
            x2={pos.x} y2={pos.y - 36}
            stroke={hasConflict ? '#B91C1C' : 'rgba(15,14,12,0.15)'}
            strokeWidth={hasConflict ? 2.5 : 1.5}
            strokeDasharray={hasConflict ? '5 3' : '8 5'}
            className={hasConflict ? 'route-line-conflict' : 'animate-data-flow-slow'}
            style={{ animationDelay: `${i * 0.4}s` }}
          />
        );
      })}

      {/* Warehouse node */}
      <g filter="url(#cmd-shadow)">
        <rect x="245" y="58" width="110" height="52" rx="3" fill="#0F0E0C" />
        <text x="300" y="80" textAnchor="middle" fill="#F5F0E8" fontSize="8" fontFamily="Space Grotesk, sans-serif" fontWeight="600" letterSpacing="0.1em">WAREHOUSE</text>
        <text x="300" y="93" textAnchor="middle" fill="#6B6560" fontSize="8" fontFamily="Space Grotesk, sans-serif" fontWeight="500">WH-1</text>
        <text x="300" y="105" textAnchor="middle" fill="#2D6A4F" fontSize="7.5" fontFamily="Space Grotesk, sans-serif" fontWeight="600" letterSpacing="0.06em">OPERATIONAL</text>
      </g>

      {/* Camp nodes */}
      {camps.map((camp, i) => {
        const pos = positions[i] || { x: 120 + i * 180, y: 320 };
        const profile = locationIndex[camp.locationId];
        const survivalHours = profile?.survivalWindowHours;
        const statusColor = getSeverityColor(survivalHours, camp.confirmedQuantity);
        const hasConflict = conflictLocations.has(camp.locationId);
        const name = profile?.name ?? camp.locationId;
        const nameParts = name.split(' ');

        return (
          <g
            key={camp.locationId}
            onClick={() => onCampClick?.(camp.locationId)}
            style={{ cursor: onCampClick ? 'pointer' : 'default' }}
            filter={hasConflict ? 'url(#conflict-glow)' : 'url(#cmd-shadow)'}
          >
            <circle
              cx={pos.x} cy={pos.y}
              r="40"
              fill={hasConflict ? '#FEF2F2' : '#F5F0E8'}
              stroke={statusColor}
              strokeWidth={hasConflict ? 2.5 : 1.5}
              className={hasConflict ? 'animate-conflict-pulse' : ''}
            />
            {/* Camp label */}
            <text x={pos.x} y={pos.y - 8} textAnchor="middle" fill="rgba(15,14,12,0.5)" fontSize="6.5" fontFamily="Space Grotesk, sans-serif" fontWeight="600" letterSpacing="0.1em">
              {nameParts[0].toUpperCase()}
            </text>
            <text x={pos.x} y={pos.y + 7} textAnchor="middle" fill={hasConflict ? '#B91C1C' : '#0F0E0C'} fontSize="11" fontFamily="Space Grotesk, sans-serif" fontWeight="700" letterSpacing="-0.01em">
              {nameParts[1]?.toUpperCase() ?? camp.locationId}
            </text>
            {/* Survival hours */}
            <text x={pos.x} y={pos.y + 22} textAnchor="middle" fill={statusColor} fontSize="8" fontFamily="Space Grotesk, sans-serif" fontWeight="600">
              {survivalHours !== undefined ? `${survivalHours}h` : `${camp.confirmedQuantity}L`}
            </text>
            {/* Conflict badge */}
            {hasConflict && (
              <>
                <rect x={pos.x - 30} y={pos.y + 33} width="60" height="12" rx="2" fill="#B91C1C" />
                <text x={pos.x} y={pos.y + 42} textAnchor="middle" fill="white" fontSize="6" fontFamily="Space Grotesk, sans-serif" fontWeight="700" letterSpacing="0.08em">⚠ CONFLICT</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
