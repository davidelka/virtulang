import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ActivityResult, CEFR, RoleplayContent, TutorCorrection } from '../types';
import type { TemplateProps } from '.';
import { ar } from '../i18n/ar';
import { Bi, Tx, both, type Sel } from '../components/Tx';
import { askRoleplay, type TutorTurn } from '../lib/aiTutor';
import { goalsFor, scriptedTurn } from '../lib/roleplay';
import { canListen, canSpeak, listen, speakHebrew, stopSpeaking } from '../lib/speech';
import { useProgress } from '../store/useProgress';
import { EMPTY_RESULT } from '../store/scoring';

type Line =
  | { from: 'char'; he: string; ar: string; correction: TutorCorrection | null; offline: boolean }
  | { from: 'me'; text: string; spoken: boolean };

const LEVEL_CHOICES: CEFR[] = ['A1', 'A2', 'B1'];

/**
 * Spoken role-play: the character (AI, or a script when the AI server is down) chats with the student,
 * who has to cover the goals for their level by speaking Hebrew.
 */
export function RoleplayTemplate({ activityId, content, onComplete }: TemplateProps<RoleplayContent>) {
  const progress = useProgress();
  const voice = content.character.gender;
  // Starts at the student's level; the intro screen lets a teacher demo the other levels.
  const [level, setLevel] = useState<CEFR>(() => goalsFor(content, progress.level).level);
  const { goals } = goalsFor(content, level);

  const [started, setStarted] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [met, setMet] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [micOk, setMicOk] = useState(canListen);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [notice, setNotice] = useState<Sel | null>(null);
  const [input, setInput] = useState('');

  const linesRef = useRef<Line[]>([]);
  const metRef = useRef<string[]>([]);
  const alive = useRef(true);
  const voiceMode = useRef(true);
  const stopListening = useRef<(() => void) | null>(null);
  const result = useRef<ActivityResult>({ ...EMPTY_RESULT });
  const endRef = useRef<HTMLDivElement>(null);
  linesRef.current = lines;
  metRef.current = met;

  useEffect(() => {
    alive.current = true; // set again on remount (React dev mode mounts twice)
    return () => {
      alive.current = false;
      stopListening.current?.();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [lines, thinking, interim, notice, finished]);

  async function respond(history: Line[]) {
    setThinking(true);
    const turns: TutorTurn[] = history.map((l) =>
      l.from === 'me' ? { role: 'student', text: l.text } : { role: 'tutor', text: l.he },
    );
    const last = history[history.length - 1];
    const lastStudent = last?.from === 'me' ? last : null;

    const ai = await askRoleplay(activityId, level, metRef.current, turns, progress.addressAs);
    const turn = ai ?? scriptedTurn(content, goals, metRef.current, lastStudent ? lastStudent.text : null);
    if (!alive.current) return;
    setThinking(false);

    if (lastStudent) {
      const covered = turn.goalsMet.length > 0;
      if (lastStudent.spoken) {
        if (covered) result.current.spokenCorrect++;
        else result.current.spokenAttempts++;
      }
    }
    const correction = ai?.correction ?? null;
    if (correction) result.current.mistakes++;

    const nextMet = [...metRef.current, ...turn.goalsMet.filter((id) => !metRef.current.includes(id))];
    setMet(nextMet);
    setLines((ls) => [...ls, { from: 'char', he: turn.he, ar: turn.ar, correction, offline: !ai }]);
    setFinished(turn.finished);

    await speakHebrew(turn.he, voice);
    if (alive.current && !turn.finished && voiceMode.current && micOk) startMic();
  }

  function start() {
    setStarted(true);
    respond([]);
  }

  function send(text: string, spoken: boolean) {
    const t = text.trim();
    if (!t || thinking || finished) return;
    voiceMode.current = spoken;
    const next: Line[] = [...linesRef.current, { from: 'me', text: t, spoken }];
    setLines(next);
    setInput('');
    setInterim('');
    setNotice(null);
    respond(next);
  }

  function startMic() {
    if (!micOk || stopListening.current) return;
    stopSpeaking();
    setNotice(null);
    setInterim('');
    setListening(true);
    stopListening.current = listen('he-IL', {
      onInterim: setInterim,
      onResult: (alternatives) => send(alternatives[0], true),
      onError: (error) => {
        setInterim('');
        if (error === 'no-speech' || error === 'other') {
          setNotice(() => (d: typeof ar) => d.roleplay.noSpeech);
          return;
        }
        setMicOk(false);
        setNotice(() => (d: typeof ar) => (error === 'network' ? d.roleplay.micUnavailable : d.roleplay.micBlocked));
      },
      onEnd: () => {
        stopListening.current = null;
        setListening(false);
      },
    });
  }

  function toggleMic() {
    if (listening) stopListening.current?.();
    else {
      voiceMode.current = true;
      startMic();
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(input, false);
  };

  const checklist = (
    <ul className="rp-goals">
      {goals.map((g) => (
        <li key={g.id} className={met.includes(g.id) ? 'done' : ''}>
          <span aria-hidden>{met.includes(g.id) ? '✅' : '⬜'}</span> <Bi ar={g.labelAr} he={g.labelHe} />
        </li>
      ))}
    </ul>
  );

  if (!started) {
    return (
      <div className="rp-intro">
        <div className="rp-character">
          <span className="rp-emoji" aria-hidden>
            {content.character.emoji}
          </span>
          <Bi ar={content.character.nameAr} he={content.character.nameHe} />
        </div>
        <p className="card">
          <Bi ar={content.scenarioAr} he={content.scenarioHe} />
        </p>
        <div className="rp-levels">
          <Tx t={(d) => d.roleplay.yourLevel} />
          {LEVEL_CHOICES.filter((l) => content.levels[l]?.length).map((l) => (
            <button key={l} className={`chip ${l === level ? 'on' : ''}`} onClick={() => setLevel(l)} aria-pressed={l === level}>
              {l}
            </button>
          ))}
        </div>
        <div className="card">
          <b>
            <Tx t={(d) => d.roleplay.goals} />
          </b>
          {checklist}
        </div>
        {!canListen && (
          <div className="notice">
            ⚠️ <Tx t={(d) => d.roleplay.noMic} />
          </div>
        )}
        <div className="sticky-action">
          <button className="btn btn-primary btn-block" onClick={start}>
            <Tx t={(d) => d.roleplay.start} />
          </button>
        </div>
      </div>
    );
  }

  const lastIsChar = lines[lines.length - 1]?.from === 'char';

  return (
    <>
      <details className="rp-goals-box" open>
        <summary>
          <Tx t={(d) => d.roleplay.goals} /> {met.filter((id) => goals.some((g) => g.id === id)).length}/{goals.length}
        </summary>
        {checklist}
      </details>

      <div className="chat">
        {lines.map((l, i) =>
          l.from === 'char' ? (
            <div key={i} className="bubble-row them">
              <span className="speaker" lang="he">
                {content.character.emoji} {content.character.nameHe}
              </span>
              <div className="bubble rp-bubble">
                <div lang="he" className="rp-he">
                  {canSpeak && (
                    <button className="speak-btn" onClick={() => speakHebrew(l.he, voice)} aria-label={ar.dialogue.listen}>
                      🔊
                    </button>
                  )}
                  {l.he}
                </div>
                <div className="rp-ar">{l.ar}</div>
                {l.correction && (
                  <div className="bot-fix">
                    <span lang="he">
                      ✏️ {l.correction.said} ← <b>{l.correction.better}</b>
                    </span>
                    <div>{l.correction.noteAr}</div>
                  </div>
                )}
                {l.offline && (
                  <div className="bot-offline">
                    <Tx t={(d) => d.roleplay.offline} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={i} className="bubble-row me">
              <span className="speaker">
                {l.spoken && '🎤 '}
                <Tx t={(d) => d.dialogue.you} />
              </span>
              <div className="bubble" lang={/[֐-׿]/.test(l.text) ? 'he' : 'ar'}>
                {l.text}
              </div>
            </div>
          ),
        )}
        {listening && interim && (
          <div className="bubble-row me">
            <div className="bubble draft" lang="he">
              {interim}…
            </div>
          </div>
        )}
        {thinking && (
          <div className="bubble-row them">
            <div className="bubble rp-thinking">
              {content.character.emoji} <Tx t={(d) => d.roleplay.thinking} />
            </div>
          </div>
        )}
        {notice && (
          <div className="bot-notice" role="status">
            <Tx t={notice} />
          </div>
        )}
      </div>

      {finished ? (
        <div className="sticky-action">
          <div className="feedback praise rp-done">
            <Tx t={(d) => d.roleplay.allDone} />
          </div>
          <button className="btn btn-primary btn-block" onClick={() => onComplete({ ...result.current })}>
            <Tx t={(d) => d.roleplay.finish} />
          </button>
        </div>
      ) : (
        <div className="rp-controls">
          {micOk && (
            <div className="bot-mic">
              <button
                className={`mic-big ${listening ? 'listening' : ''}`}
                onClick={toggleMic}
                disabled={thinking}
                aria-pressed={listening}
              >
                🎤
              </button>
              <span className="mic-label">
                <Tx
                  t={(d) =>
                    listening
                      ? d.roleplay.listening
                      : thinking
                        ? d.roleplay.thinking
                        : lastIsChar
                          ? d.roleplay.yourTurn
                          : d.roleplay.tapToTalk
                  }
                />
              </span>
            </div>
          )}
          <form className="bot-input" onSubmit={submit}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={both((d) => d.roleplay.placeholder)} />
            <button className="btn btn-primary" type="submit" disabled={thinking}>
              <Tx t={(d) => d.roleplay.send} />
            </button>
          </form>
        </div>
      )}
      <div ref={endRef} />
    </>
  );
}
