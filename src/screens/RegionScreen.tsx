import { useEffect } from 'react';
import { Bi, Tx, type Sel } from '../components/Tx';
import { ar } from '../i18n/ar';
import { activitiesForPoi, getRegion, levelAtLeast, poisForRegion } from '../lib/content';
import { navigate } from '../router';
import { actions, useProgress } from '../store/useProgress';
import { TopBar } from '../components/TopBar';
import { Stars } from '../components/Stars';
import type { ActivityTemplate } from '../types';

const TEMPLATE_ICON: Record<ActivityTemplate, string> = { dialogue: '💬', match: '🧩', roleplay: '🎭' };

export function RegionScreen({ id }: { id: string }) {
  const progress = useProgress();
  const region = getRegion(id);
  const locked = !!region && !levelAtLeast(progress.level, region.requiredLevel);

  useEffect(() => {
    if (region && !locked) actions.visitRegion(region.id);
  }, [region, locked]);

  if (!region) return <NotFound text={(d) => d.region.notFound} />;

  return (
    <>
      <TopBar back="/" title={<Bi ar={region.nameAr} he={region.nameHe} />} />
      <main className="screen">
        <div className="region-header" style={{ background: region.color }}>
          <h1>
            {region.icon} <Bi ar={region.nameAr} he={region.nameHe} />
          </h1>
        </div>

        {locked ? (
          <p className="card">🔒 <Tx t={(d) => d.region.locked(region.requiredLevel!)} /></p>
        ) : (
          poisForRegion(region.id).map((poi) => {
            const list = activitiesForPoi(poi);
            return (
              <section key={poi.id} className="card poi-card">
                <h2>
                  <Bi ar={poi.nameAr} he={poi.nameHe} />
                </h2>
                {list.length === 0 && <p className="muted"><Tx t={(d) => d.region.soon} /></p>}
                {list.map((a) => (
                  <button key={a.id} className="activity-row" onClick={() => navigate(`/activity/${a.id}`)}>
                    <span className="activity-icon" aria-hidden>
                      {TEMPLATE_ICON[a.template]}
                    </span>
                    <span className="activity-info">
                      <b>
                        <Bi ar={a.titleAr} he={a.titleHe} />
                      </b>
                      <span className="activity-meta">
                        <span className="level-badge">{a.level}</span>
                        <Tx t={(d) => d.region.template[a.template]} />
                        <span>· {ar.region.pointsShort(a.points)}</span>
                      </span>
                    </span>
                    <Stars count={progress.stars[a.id] ?? 0} />
                  </button>
                ))}
              </section>
            );
          })
        )}
      </main>
    </>
  );
}

export function NotFound({ text }: { text: Sel }) {
  return (
    <main className="not-found">
      <p>
        <Tx t={text} />
      </p>
      <button className="btn btn-primary" onClick={() => navigate('/')}>
        <Tx t={(d) => d.common.toMap} />
      </button>
    </main>
  );
}
