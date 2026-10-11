import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityResult, DialogueContent, DialogueOption } from '../types';
import type { TemplateProps } from '.';
import { ar } from '../i18n/ar';
import { Tx, type Sel } from '../components/Tx';
import { shuffle } from '../lib/shuffle';
import { checkSpoken } from '../lib/answerMatch';
import { canListen, canSpeak, listen, speakHebrew, stopSpeaking } from '../lib/speech';
import { useProgress } from '../store/useProgress';
import { EMPTY_RESULT } from '../store/scoring';

const MAX_TRIES = 3;
const NEXT_LINE_DELAY = 1400;

type Feedback =
  | { kind: 'praise'; index: number }
  | { kind: 'almost'; expected: string; triesLeft: number }
  | { kind: 'info'; text: Sel };

/** 'asked' = the student tapped "need help?" (costs points); 'free' = no penalty (out of tries, mic unavailable). */
type Help = 'none' | 'asked' | 'free';

interface Answer {
  text: string;
  spoken: boolean;
}

export function DialogueTemplate({ content, onComplete }: TemplateProps<DialogueContent>) {
  const { turns } = content;
  const progress = useProgress();
  const voice = content.speakerGender ?? progress.voice;

  const [turn, setTurn] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [micOk, setMicOk] = useState(canListen);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [tries, setTries] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [help, setHelp] = useState<Help>('none');
  const [triedOptions, setTriedOptions] = useState<string[]>([]);
  const [optionHint, setOptionHint] = useState<Sel | null>(null);

  const result = useRef<ActivityResult>({ ...EMPTY_RESULT });
  const stopListening = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const current = turns[turn];
  const isLast = turn === turns.length - 1;
  const needsAnswer = !!(current.expectedAnswers?.length || current.options?.length);
  const answered = turn in answers;
  const waiting = needsAnswer && !answered;
  const speechMode = micOk && !!current.expectedAnswers?.length;
  const showOptions = !!current.options && (help !== 'none' || !speechMode);
  const options = useMemo(() => (current.options ? shuffle(current.options) : []), [current]);

  // New line: reset the turn and read the character's line aloud.
  useEffect(() => {
    setTries(0);
    setFeedback(null);
    setHelp('none');
    setTriedOptions([]);
    setOptionHint(null);
    speakHebrew(turns[turn].lineHe, voice);
  }, [turn, turns, voice]);

  useEffect(
    () => () => {
      stopListening.current?.();
      stopSpeaking();
    },
    [],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turn, answered, feedback, interim, showOptions, optionHint]);

  function accept(answer: Answer) {
    setAnswers((a) => ({ ...a, [turn]: answer }));
    if (!isLast) setTimeout(() => setTurn((t) => t + 1), NEXT_LINE_DELAY);
  }

  function toggleMic() {
    if (listening) {
      stopListening.current?.();
      return;
    }
    setFeedback(null);
    setInterim('');
    setListening(true);
    stopListening.current = listen('he-IL', {
      onInterim: setInterim,
      onResult: (alternatives) => {
        setInterim('');
        const verdict = checkSpoken(alternatives, current.expectedAnswers ?? []);
        if (verdict.ok) {
          result.current.spokenCorrect++;
          setFeedback({ kind: 'praise', index: Math.floor(Math.random() * ar.dialogue.praise.length) });
          accept({ text: verdict.heard, spoken: true });
          return;
        }
        result.current.spokenAttempts++;
        result.current.mistakes++;
        const used = tries + 1;
        setTries(used);
        setFeedback({ kind: 'almost', expected: verdict.closest, triesLeft: MAX_TRIES - used });
        speakHebrew(verdict.closest, progress.voice);
        if (used >= MAX_TRIES) setHelp((h) => (h === 'none' ? 'free' : h));
      },
      onError: (error) => {
        if (error === 'no-speech' || error === 'other') {
          setFeedback({ kind: 'info', text: (d) => d.dialogue.noSpeech });
          return;
        }
        setMicOk(false); // blocked or offline: continue with options, no penalty
        setFeedback({ kind: 'info', text: (d) => (error === 'network' ? d.dialogue.network : d.dialogue.micBlocked) });
      },
      onEnd: () => setListening(false),
    });
  }

  function choose(o: DialogueOption) {
    if (!o.correct) {
      result.current.mistakes++;
      setTriedOptions((t) => [...t, o.he]);
      setOptionHint(() => (d: typeof ar) => d.dialogue.hint(o.ar));
      return;
    }
    if (help === 'asked' && speechMode) result.current.helpUsed++;
    setOptionHint(null);
    setFeedback(null);
    accept({ text: o.he, spoken: false });
  }

  const outOfTries = tries >= MAX_TRIES;

  return (
    <>
      <div className="chat">
        {turns.slice(0, turn + 1).map((t, i) => (
          <div key={i} style={{ display: 'contents' }}>
            <div className="bubble-row them">
              <span className="speaker" lang="he">
                {t.speaker}
              </span>
              <div className="bubble" lang="he">
                {canSpeak && (
                  <button className="speak-btn" onClick={() => speakHebrew(t.lineHe, voice)} aria-label={ar.dialogue.listen}>
                    🔊
                  </button>
                )}
                {t.lineHe}
              </div>
            </div>
            {answers[i] && (
              <div className="bubble-row me">
                <span className="speaker">
                  {answers[i].spoken && '🎤 '}
                  <Tx t={(d) => d.dialogue.you} />
                </span>
                <div className="bubble" lang="he">
                  {answers[i].text}
                </div>
              </div>
            )}
          </div>
        ))}
        {listening && interim && (
          <div className="bubble-row me">
            <div className="bubble draft" lang="he">
              {interim}…
            </div>
          </div>
        )}
      </div>

      {(waiting || feedback?.kind === 'praise') && (
        <div className="answer-area">
          {waiting && current.hintAr && (
            <div className="task">
              {/* Arabic only on purpose: the Hebrew would give away the answer. */}
              <b>
                🎯 <Tx t={(d) => d.dialogue.task} />
              </b>
              <div>{current.hintAr}</div>
            </div>
          )}

          {waiting && !canListen && current.expectedAnswers && <div className="notice">⚠️ <Tx t={(d) => d.dialogue.unsupported} /></div>}

          {feedback?.kind === 'praise' && (
            <div className="feedback praise" role="status">
              <Tx t={(d) => d.dialogue.praise[feedback.index]} />
              <small>
                <Tx t={(d) => d.dialogue.pointsCorrect} />
              </small>
            </div>
          )}
          {feedback?.kind === 'almost' && (
            <div className="feedback almost" role="status">
              <div><Tx t={(d) => d.dialogue.almost} /></div>
              <button className="expected" lang="he" onClick={() => speakHebrew(feedback.expected, progress.voice)}>
                🔊 {feedback.expected}
              </button>
              <small>
                <Tx
                  t={(d) =>
                    d.dialogue.pointsAttempt + (feedback.triesLeft > 0 ? ` · ${d.dialogue.tries(feedback.triesLeft)}` : '')
                  }
                />
              </small>
            </div>
          )}
          {feedback?.kind === 'info' && (
            <div className="feedback info" role="status">
              <Tx t={feedback.text} />
            </div>
          )}
          {waiting && outOfTries && speechMode && <div className="feedback info"><Tx t={(d) => d.dialogue.outOfTries} /></div>}

          {waiting && speechMode && !outOfTries && (
            <div className="mic-area">
              <button className={`mic-big ${listening ? 'listening' : ''}`} onClick={toggleMic} aria-pressed={listening}>
                🎤
              </button>
              <span className="mic-label">
                <Tx t={(d) => (listening ? d.dialogue.micStop : tries > 0 ? d.dialogue.micAgain : d.dialogue.micStart)} />
              </span>
              {help === 'none' && current.options && (
                <button className="help-link" onClick={() => setHelp('asked')}>
                  <Tx t={(d) => `${d.dialogue.needHelp} ${d.dialogue.helpCost}`} />
                </button>
              )}
            </div>
          )}

          {waiting && showOptions && (
            <>
              <span className="label"><Tx t={(d) => d.dialogue.choose} /></span>
              {options.map((o) => (
                <button
                  key={o.he}
                  className={`option ${triedOptions.includes(o.he) ? 'tried' : ''}`}
                  disabled={triedOptions.includes(o.he)}
                  onClick={() => choose(o)}
                  lang="he"
                >
                  {o.he}
                </button>
              ))}
              {optionHint && (
                <div className="hint" role="status">
                  💡 <Tx t={optionHint} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!waiting && !isLast && !needsAnswer && (
        <div className="sticky-action">
          <button className="btn btn-secondary btn-block" onClick={() => setTurn((t) => t + 1)}>
            <Tx t={(d) => d.dialogue.continue} />
          </button>
        </div>
      )}

      {isLast && !waiting && (
        <div className="sticky-action">
          <button className="btn btn-primary btn-block" onClick={() => onComplete({ ...result.current })}>
            <Tx t={(d) => d.dialogue.finish} />
          </button>
        </div>
      )}
      <div ref={endRef} />
    </>
  );
}
