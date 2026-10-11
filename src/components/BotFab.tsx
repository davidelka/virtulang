import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ar } from '../i18n/ar';
import { Tx, both } from './Tx';
import { botReply, botWelcome } from '../lib/bot';
import { canListen, canSpeak, listen, speakHebrew } from '../lib/speech';
import { actions, useProgress } from '../store/useProgress';
import type { BotText } from '../types';

type Msg = { from: 'bot'; text: BotText } | { from: 'user'; text: string };

export function BotFab() {
  const { voice } = useProgress();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'bot', text: botWelcome }]);
  const [input, setInput] = useState('');
  const [micLang, setMicLang] = useState<'he-IL' | 'ar-IL'>('he-IL');
  const [listening, setListening] = useState(false);
  const stopListening = useRef<(() => void) | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs, open]);

  function ask(q: string) {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { from: 'user', text: q }]);
    setInput('');
    const reply = botReply(q);
    setTimeout(() => {
      setMsgs((m) => [...m, { from: 'bot', text: reply }]);
      speakHebrew(reply.he, voice);
    }, 450);
  }

  function toggleMic() {
    if (listening) return stopListening.current?.();
    setListening(true);
    setInput('');
    stopListening.current = listen(micLang, {
      onInterim: setInput,
      onResult: (alternatives) => ask(alternatives[0]),
      onError: () => setInput(''),
      onEnd: () => setListening(false),
    });
  }

  function close() {
    stopListening.current?.();
    setOpen(false);
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  if (!open)
    return (
      <button className="bot-fab" onClick={() => setOpen(true)} aria-label={ar.bot.open}>
        🧑‍🏫
      </button>
    );

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
          <button className="icon-btn" onClick={close} aria-label={ar.bot.close}>✕</button>
        </div>
        <div className="bot-messages">
          {msgs.map((m, i) =>
            m.from === 'user' ? (
              <div key={i} className="bot-msg user">{m.text}</div>
            ) : (
              <div key={i} className="bot-msg bot">
                <div className="he" lang="he">
                  {canSpeak && (
                    <button className="speak-btn" onClick={() => speakHebrew(m.text.he, voice)} aria-label={ar.bot.listen}>🔊</button>
                  )}
                  {m.text.he}
                </div>
                <div className="gloss">{m.text.ar}</div>
              </div>
            ),
          )}
          <div ref={endRef} />
        </div>
        <div className="bot-suggestions">
          {ar.bot.suggestions.map((s) => (
            <button key={s} onClick={() => ask(s)}>{s}</button>
          ))}
        </div>
        <form className="bot-input" onSubmit={submit}>
          {canListen && (
            <>
              <button
                type="button"
                className={`mic-small ${listening ? 'listening' : ''}`}
                onClick={toggleMic}
                aria-label={listening ? ar.bot.micStop : ar.bot.mic}
              >
                🎤
              </button>
              <button
                type="button"
                className="mic-lang"
                onClick={() => setMicLang((l) => (l === 'he-IL' ? 'ar-IL' : 'he-IL'))}
                aria-label={ar.bot.micLangLabel}
              >
                {micLang === 'he-IL' ? ar.bot.micLang.he : ar.bot.micLang.ar}
              </button>
            </>
          )}
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={both((d) => d.bot.placeholder)} />
          <button className="btn btn-primary" type="submit"><Tx t={(d) => d.bot.send} /></button>
        </form>
      </section>
    </>
  );
}
