import { useEffect, useState } from 'react';
import type { MatchContent } from '../types';
import type { TemplateProps } from '.';
import { Tx } from '../components/Tx';
import { shuffle } from '../lib/shuffle';
import { speakHebrew } from '../lib/speech';
import { useProgress } from '../store/useProgress';
import { EMPTY_RESULT } from '../store/scoring';

type Side = 'he' | 'ar';

export function MatchTemplate({ content, onComplete }: TemplateProps<MatchContent>) {
  const { voice } = useProgress();
  const [cols] = useState(() => {
    const indexed = content.pairs.map((p, i) => ({ ...p, i }));
    return { he: shuffle(indexed), ar: shuffle(indexed) };
  });
  const [sel, setSel] = useState<Record<Side, number | null>>({ he: null, ar: null });
  const [matched, setMatched] = useState<number[]>([]);
  const [wrong, setWrong] = useState<Record<Side, number | null> | null>(null);
  const [mistakes, setMistakes] = useState(0);

  const allDone = matched.length === content.pairs.length;

  useEffect(() => {
    if (sel.he === null || sel.ar === null) return;
    if (sel.he === sel.ar) {
      setMatched((m) => [...m, sel.he!]);
    } else {
      setMistakes((m) => m + 1);
      setWrong(sel);
      setTimeout(() => setWrong(null), 600);
    }
    setSel({ he: null, ar: null });
  }, [sel]);

  const pick = (side: Side, i: number) => {
    if (matched.includes(i)) return;
    if (side === 'he') speakHebrew(content.pairs[i].he, voice);
    setSel((s) => ({ ...s, [side]: s[side] === i ? null : i }));
  };

  const tileClass = (side: Side, i: number) =>
    [
      'tile',
      matched.includes(i) && 'matched',
      sel[side] === i && 'selected',
      wrong?.[side] === i && 'wrong',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <>
      <p className="muted"><Tx t={(d) => d.match.instructions} /></p>
      <div className="match-grid">
        {(['he', 'ar'] as Side[]).map((side) => (
          <div key={side} className="match-col">
            <h3>
              <Tx t={(d) => (side === 'he' ? d.match.hebrew : d.match.arabic)} />
            </h3>
            {cols[side].map((p) => (
              <button
                key={p.i}
                className={tileClass(side, p.i)}
                disabled={matched.includes(p.i)}
                onClick={() => pick(side, p.i)}
                lang={side}
              >
                {p[side]}
              </button>
            ))}
          </div>
        ))}
      </div>
      <p className="match-status" role="status">
        {allDone ? <Tx t={(d) => `🎉 ${d.match.allDone}`} /> : wrong ? <Tx t={(d) => d.match.tryAgain} /> : ''}
      </p>
      {allDone && (
        <div className="sticky-action">
          <button className="btn btn-primary btn-block" onClick={() => onComplete({ ...EMPTY_RESULT, mistakes })}>
            <Tx t={(d) => d.match.finish} />
          </button>
        </div>
      )}
    </>
  );
}
