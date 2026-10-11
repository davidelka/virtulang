import { Bi, Tx, type Sel } from '../components/Tx';
import { getActivity, getPoi } from '../lib/content';
import { navigate } from '../router';
import { NotFound } from './RegionScreen';

export function ActivityDone({ id, query }: { id: string; query: URLSearchParams }) {
  const activity = getActivity(id);
  if (!activity) return <NotFound text={(d) => d.activity.notFound} />;

  const num = (k: string) => Number(query.get(k)) || 0;
  const stars = Math.min(3, Math.max(1, num('s')));
  const base = num('b');
  const lines: [Sel, number][] = [
    [(d) => d.done.base, base],
    [(d) => d.done.help, -num('h')],
    [(d) => d.done.bonus, num('x')],
    [(d) => d.done.spokenCorrect, num('c')],
    [(d) => d.done.spokenAttempts, num('a')],
  ];
  const total = lines.reduce((sum, [, n]) => sum + n, 0);
  const regionId = getPoi(activity.poiId)?.regionId;

  return (
    <main className="screen center done">
      <div className="done-stars" aria-label={`${stars}/3`}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={i < stars ? undefined : { filter: 'grayscale(1)', opacity: 0.3 }}>
            ⭐
          </span>
        ))}
      </div>
      <h1><Tx t={(d) => d.done.titles[stars]} /></h1>
      <p className="muted">
        <Bi ar={activity.titleAr} he={activity.titleHe} />
      </p>

      <div className="card reward-table">
        <h3><Tx t={(d) => d.done.earned} /></h3>
        {lines
          .filter(([, n], i) => i === 0 || n !== 0)
          .map(([label, n], i) => (
            <div key={i} className="reward-line">
              <span>
                <Tx t={label} />
              </span>
              <b dir="ltr">{n > 0 ? `+${n}` : n}</b>
            </div>
          ))}
        <div className="reward-line total">
          <span><Tx t={(d) => d.done.total} /></span>
          <span>⭐ {total}</span>
        </div>
      </div>

      <div className="done-actions">
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          <Tx t={(d) => d.done.backToMap} />
        </button>
        {regionId && (
          <button className="btn btn-secondary" onClick={() => navigate(`/region/${regionId}`)}>
            <Tx t={(d) => d.done.moreHere} />
          </button>
        )}
        <button className="btn" onClick={() => navigate(`/activity/${activity.id}`, { replace: true })}>
          <Tx t={(d) => d.done.retry} />
        </button>
      </div>
    </main>
  );
}
