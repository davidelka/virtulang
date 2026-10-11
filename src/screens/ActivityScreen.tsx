import { ar } from '../i18n/ar';
import { Bi } from '../components/Tx';
import { getActivity, getPoi } from '../lib/content';
import { navigate } from '../router';
import { actions } from '../store/useProgress';
import { templates } from '../templates';
import { NotFound } from './RegionScreen';
import type { ActivityResult } from '../types';

export function ActivityScreen({ id }: { id: string }) {
  const activity = getActivity(id);
  if (!activity) return <NotFound text={(d) => d.activity.notFound} />;

  const poi = getPoi(activity.poiId);
  const back = poi ? `/region/${poi.regionId}` : '/';
  const Template = templates[activity.template];

  function complete(result: ActivityResult) {
    const r = actions.completeActivity(activity!, result);
    const q = new URLSearchParams({
      s: String(r.stars),
      b: String(r.base),
      h: String(r.helpPenalty),
      x: String(r.bonus),
      c: String(r.spokenCorrect),
      a: String(r.spokenAttempts),
    });
    navigate(`/done/${activity!.id}?${q}`, { replace: true });
  }

  return (
    <div className="activity-shell has-sticky">
      <header className="topbar">
        <button className="icon-btn" onClick={() => navigate(back)} aria-label={ar.activity.exit}>
          ✕
        </button>
        <h1 className="topbar-title">
          <Bi ar={activity.titleAr} he={activity.titleHe} />
        </h1>
        <span className="level-badge">{activity.level}</span>
      </header>
      <main className="activity-body">
        <Template content={activity.content} onComplete={complete} />
      </main>
    </div>
  );
}

