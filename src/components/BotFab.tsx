import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ar } from '../i18n/ar';
import { Tx, both, type Sel } from './Tx';
import { askTutor, type TutorTurn } from '../lib/aiTutor';
import { botReply, botWelcome } from '../lib/bot';
import { canListen, canSpeak, listen, speakHebrew, stopSpeaking } from '../lib/speech';
import { actions, useProgress } from '../store/useProgress';
import type { BotText, TutorCorrection } from '../types';

type Msg =
  | { from: 'bot'; text: BotText; correction?: TutorCorrection | null; offline?: boolean }
  | { from: 'user'; text: string; spoken: boolean };

const toTurns = (msgs: Msg[]): TutorTurn[] =>
  msgs.map((m) => (m.from === 'user' ? { role: 'student', text: m.text } : { role: 'tutor', text: m.text.he }));

/**
 * The tutor-bot: a spoken conversation. The tutor opens with a question, reads every reply aloud,
 * and then listens for the student's answer. Typing is the fallback.
 * Uses the AI server when it's reachable, otherwise the local keyword replies.
 */
export function BotFab() {
  const { voice, level, addressAs } = useProgress();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [interim, setInterim] = useState('');
  const [micLang, setMicLang] = useState<'he-IL' | 'ar-IL'>('he-IL');
  const [micOk, setMicOk] = useState(canListen);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [notice, setNotice] = useState<Sel | null>(null);

  const msgsRef = useRef<Msg[]>([]);
  const openRef = useRef(false);
  const voiceMode = useRef(true); // keep listening after each reply until the student types instead
  const stopListening = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  msgsRef.current = msgs;
  openRef.current = open;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs, open, interim, thinking, notice]);

  // First open: the tutor starts the conversation.
  useEffect(() => {
    if (open && msgsRef.current.length === 0) respond([]);
  }, [open]);

  async function respond(history: Msg[]) {
    setThinking(true);
    const ai = await askTutor(level, toTurns(history), addressAs);
    let msg: Msg;
    if (ai) {
      msg = { from: 'bot', text: { he: ai.he, ar: ai.ar }, correction: ai.correction };
    } else {
      const lastUser = [...history].reverse().find((m) => m.from === 'user');
      msg = { from: 'bot', text: lastUser ? botReply(lastUser.text) : botWelcome, offline: true };
    }
    setThinking(false);
    if (!openRef.current) return;
    setMsgs((m) => [...m, msg]);
    await speakHebrew(msg.text.he, voice);
    // Hands-free: once the tutor has finished speaking, it's the student's turn to answer out loud.
    if (openRef.current && voiceMode.current && micOk) startMic();
  }

  function send(text: string, spoken: boolean) {
    const t = text.trim();
    if (!t || thinking) return;
    voiceMode.current = spoken;
    const next: Msg[] = [...msgsRef.current, { from: 'user', text: t, spoken }];
    setMsgs(next);
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
    stopListening.current = listen(micLang, {
      onInterim: setInterim,
      onResult: (alternatives) => send(alternatives[0], true),
      onError: (error) => {
        setInterim('');
        if (error === 'no-speech' || error === 'other') {
          setNotice(() => (d: typeof ar) => d.bot.noSpeech);
          return;
        }
        setMicOk(false); // blocked or no recognition service: switch to typing
        setNotice(() => (d: typeof ar) => (error === 'network' ? d.bot.micUnavailable : d.bot.micBlocked));
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

  function close() {
    stopListening.current?.();
    stopSpeaking();
    setOpen(false);
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(input, false);
  };

  if (!open)
    return (
      <button className="bot-fab" onClick={() => setOpen(true)} aria-label={ar.bot.open}>
        🧑‍🏫
      </button>
    );

  const lastIsBot = msgs[msgs.length - 1]?.from === 'bot';

  return (
    <>
      <div className="bot-backdrop" onClick={close} />
      <section className="bot-panel" role="dialog" aria-label={ar.bot.title}>
        <div className="bot-head">
          <h2>
            🧑‍🏫 <Tx t={(d) => d.bot.title} />
          </h2>
          <div className="voice-toggle">
            <Tx t={(d) => d.bot.voice} />
            {(['male', 'female'] as const).map((g) => (
              <button key={g} className={voice === g ? 'on' : ''} onClick={() => actions.setVoice(g)}>
                <Tx t={(d) => d.bot[g]} />
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={close} aria-label={ar.bot.close}>
            ✕
          </button>
        </div>

        <div className="bot-messages">
          {msgs.map((m, i) =>
            m.from === 'user' ? (
              <div key={i} className="bot-msg user" lang={/[֐-׿]/.test(m.text) ? 'he' : 'ar'}>
                {m.spoken && '🎤 '}
                {m.text}
              </div>
            ) : (
              <div key={i} className="bot-msg bot">
                <div className="he" lang="he">
                  {canSpeak && (
                    <button className="speak-btn" onClick={() => speakHebrew(m.text.he, voice)} aria-label={ar.bot.listen}>
                      🔊
                    </button>
                  )}
                  {m.text.he}
                </div>
                <div className="gloss">{m.text.ar}</div>
                {m.correction && (
                  <div className="bot-fix">
                    <span lang="he">
                      ✏️ {m.correction.said} ← <b>{m.correction.better}</b>
                    </span>
                    <div>{m.correction.noteAr}</div>
                  </div>
                )}
                {m.offline && (
                  <div className="bot-offline">
                    <Tx t={(d) => d.bot.offline} />
                  </div>
                )}
              </div>
            ),
          )}
          {listening && interim && (
            <div className="bot-msg user draft" lang={micLang === 'he-IL' ? 'he' : 'ar'}>
              🎤 {interim}…
            </div>
          )}
          {thinking && (
            <div className="bot-msg bot thinking">
              <Tx t={(d) => d.bot.thinking} />
            </div>
          )}
          {notice && (
            <div className="bot-notice" role="status">
              <Tx t={notice} />
            </div>
          )}
          <div ref={endRef} />
        </div>

        {micOk && (
          <div className="bot-mic">
            <button
              className={`mic-big ${listening ? 'listening' : ''}`}
              onClick={toggleMic}
              disabled={thinking}
              aria-pressed={listening}
              aria-label={listening ? ar.bot.micStop : ar.bot.mic}
            >
              🎤
            </button>
            <span className="mic-label">
              <Tx
                t={(d) =>
                  listening ? d.bot.listening : thinking ? d.bot.thinking : lastIsBot ? d.bot.yourTurn : d.bot.tapToTalk
                }
              />
            </span>
            <button
              type="button"
              className="mic-lang"
              onClick={() => setMicLang((l) => (l === 'he-IL' ? 'ar-IL' : 'he-IL'))}
              aria-label={ar.bot.micLangLabel}
            >
              🎤 {micLang === 'he-IL' ? ar.bot.micLang.he : ar.bot.micLang.ar}
            </button>
          </div>
        )}

        <form className="bot-input" onSubmit={submit}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={both((d) => d.bot.placeholder)} />
          <button className="btn btn-primary" type="submit" disabled={thinking}>
            <Tx t={(d) => d.bot.send} />
          </button>
        </form>
      </section>
    </>
  );
}
