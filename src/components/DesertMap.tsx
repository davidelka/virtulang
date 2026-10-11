import type { KeyboardEvent } from 'react';
import type { Progress, Region } from '../types';
import { ar } from '../i18n/ar';
import { he } from '../i18n/he';
import { getRegion, levelAtLeast, pois, regions } from '../lib/content';
import { AvatarView } from './AvatarView';

interface Props {
  progress: Progress;
  onRegion: (region: Region, locked: boolean) => void;
}

const R = 50; // region radius
const PR = 13; // point-of-interest radius

// A smooth trail through the regions, in the order they appear in regions.json.
function trailPath() {
  const pts = regions.map((r) => [r.x, r.y]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    d += ` C${x0},${(y0 + y1) / 2} ${x1},${(y0 + y1) / 2} ${x1},${y1}`;
  }
  return d;
}

const onKey = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};

export function DesertMap({ progress, onRegion }: Props) {
  const here = getRegion(progress.lastRegionId ?? '') ?? regions[0];

  return (
    <svg className="desert-map" viewBox="0 0 400 700" role="img" aria-label={ar.map.title}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f9e8c6" />
          <stop offset="1" stopColor="#efd29a" />
        </linearGradient>
      </defs>
      <rect width="400" height="700" fill="url(#sky)" />

      {/* dunes */}
      <g fill="#e8c88a" opacity="0.55">
        <path d="M0,300 Q100,250 200,295 T400,280 L400,330 L0,330 Z" />
        <path d="M0,540 Q120,500 230,545 T400,520 L400,570 L0,570 Z" />
      </g>
      <g fill="#dcb571" opacity="0.4">
        <path d="M0,700 Q150,640 260,690 T400,660 L400,700 Z" />
        <path d="M0,40 Q90,10 190,38 T400,30 L400,0 L0,0 Z" />
      </g>
      <g fontSize="22" opacity="0.85">
        <text x="352" y="70">☀️</text>
        <text x="200" y="560">🌵</text>
        <text x="345" y="520">🌴</text>
        <text x="170" y="380">🪨</text>
      </g>

      {/* trail between regions */}
      <path d={trailPath()} fill="none" stroke="#a0522d" strokeWidth="4" strokeDasharray="2 10" strokeLinecap="round" opacity="0.6" />

      {/* spokes from each region to its points of interest */}
      {pois.map((p) => {
        const r = getRegion(p.regionId)!;
        return <line key={`l-${p.id}`} x1={r.x} y1={r.y} x2={p.x} y2={p.y} stroke="#a0522d" strokeWidth="2" strokeDasharray="3 5" opacity="0.45" />;
      })}

      {/* points of interest */}
      {pois.map((p) => {
        const region = getRegion(p.regionId)!;
        const locked = !levelAtLeast(progress.level, region.requiredLevel);
        const go = () => onRegion(region, locked);
        return (
          <g key={p.id} className="poi" role="button" tabIndex={0} aria-label={p.nameAr} onClick={go} onKeyDown={onKey(go)}>
            <circle cx={p.x} cy={p.y} r={PR} fill={locked ? '#cfc6b4' : '#fff'} stroke={region.color} strokeWidth="3" />
            <text x={p.x} y={p.y + PR + 13} textAnchor="middle" fontSize="10.5" fontWeight="500" fill="#3d405b">
              {p.nameAr}
            </text>
            <text x={p.x} y={p.y + PR + 24} textAnchor="middle" fontSize="9" fill="#3d405b" opacity="0.75" lang="he">
              {p.nameHe}
            </text>
          </g>
        );
      })}

      {/* regions */}
      {regions.map((r) => {
        const locked = !levelAtLeast(progress.level, r.requiredLevel);
        const go = () => onRegion(r, locked);
        return (
          <g key={r.id} className="region" role="button" tabIndex={0} aria-label={r.nameAr} onClick={go} onKeyDown={onKey(go)}>
            <circle
              cx={r.x}
              cy={r.y}
              r={R}
              fill={locked ? '#d9d2c3' : r.color}
              fillOpacity={locked ? 0.7 : 0.92}
              stroke={locked ? '#8a8270' : '#fff'}
              strokeWidth="4"
              strokeDasharray={locked ? '8 6' : undefined}
            />
            <text x={r.x} y={r.y - 6} textAnchor="middle" fontSize="26" opacity={locked ? 0.45 : 1}>
              {r.icon}
            </text>
            <text x={r.x} y={r.y + 17} textAnchor="middle" fontSize="12.5" fontWeight="700" fill={locked ? '#5f5848' : '#fff'}>
              {r.nameAr}
            </text>
            <text x={r.x} y={r.y + 31} textAnchor="middle" fontSize="10" fill={locked ? '#5f5848' : '#fff'} opacity="0.9" lang="he">
              {r.nameHe}
            </text>
            {locked && r.requiredLevel && (
              <g>
                <rect x={r.x - 62} y={r.y - R - 12} width="124" height="22" rx="11" fill="#3d405b" />
                <text x={r.x} y={r.y - R + 3} textAnchor="middle" fontSize="10.5" fill="#fff">
                  🔒 {ar.map.locked(r.requiredLevel)} · {he.map.locked(r.requiredLevel)}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* the student's avatar, at the last region visited */}
      <foreignObject x={here.x - 26} y={here.y - R - 54} width="52" height="56" className="map-avatar" pointerEvents="none">
        <AvatarView avatarId={progress.avatarId} equipped={progress.equipped} size={44} />
      </foreignObject>
    </svg>
  );
}
