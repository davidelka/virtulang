import type { VoiceGender } from '../types';

// ---------- Text to speech ----------

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

let voices: SpeechSynthesisVoice[] = [];
if (canSpeak) {
  const load = () => (voices = speechSynthesis.getVoices());
  load();
  speechSynthesis.addEventListener?.('voiceschanged', load);
}

// Voice names rarely state gender; these cover common Hebrew voices (Carmit, Asaf, ...).
const NAME_HINT: Record<VoiceGender, RegExp> = { female: /carmit|female|woman/i, male: /asaf|\bmale|\bman\b/i };

/** 1 = the voice's normal speed. Slower suits learners. */
export const SPEECH_RATE = 0.75;

/** Speaks Hebrew text. Resolves when done (or immediately if TTS is unavailable). */
export function speakHebrew(text: string, gender: VoiceGender): Promise<void> {
  if (!canSpeak) return Promise.resolve();
  const he = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('he') || v.lang.startsWith('iw'));
  const named = he.find((v) => NAME_HINT[gender].test(v.name));
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'he-IL';
  u.voice = named ?? he[0] ?? null;
  u.rate = SPEECH_RATE;
  u.volume = 1; // the maximum the browser allows; beyond that it's the device volume
  // No voice of the right gender: shift the pitch of whatever Hebrew voice we have.
  if (!named) u.pitch = gender === 'male' ? 0.75 : 1.2;
  return new Promise((resolve) => {
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.cancel();
    // Chrome sometimes drops an utterance queued in the same tick as cancel().
    setTimeout(() => speechSynthesis.speak(u), 60);
  });
}

export const stopSpeaking = () => canSpeak && speechSynthesis.cancel();

// ---------- Speech recognition ----------

const Recognition: any =
  typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

export const canListen = !!Recognition;

export type ListenError = 'no-speech' | 'not-allowed' | 'network' | 'other';

export interface ListenHandlers {
  onInterim: (text: string) => void;
  /** Final transcript alternatives, best first. */
  onResult: (alternatives: string[]) => void;
  onError: (error: ListenError) => void;
  onEnd: () => void;
}

/** Starts one listening session. Returns a function that stops listening early. */
export function listen(lang: 'he-IL' | 'ar-IL', h: ListenHandlers): () => void {
  const rec = new Recognition();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 3;

  let finished = false;
  let lastInterim = '';

  rec.onresult = (e: any) => {
    const results = Array.from(e.results as ArrayLike<any>);
    const last = results[results.length - 1];
    if (last.isFinal) {
      finished = true;
      h.onResult(Array.from(last as ArrayLike<any>).map((a) => a.transcript.trim()).filter(Boolean));
    } else {
      lastInterim = results.map((r) => r[0].transcript).join(' ').trim();
      h.onInterim(lastInterim);
    }
  };
  rec.onerror = (e: any) => {
    if (finished) return;
    finished = true;
    const code: string = e.error;
    h.onError(
      code === 'no-speech' || code === 'aborted'
        ? 'no-speech'
        : code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture'
          ? 'not-allowed'
          : code === 'network'
            ? 'network'
            : 'other',
    );
  };
  rec.onend = () => {
    // Some Android builds end without a final result; use the last interim text.
    if (!finished) {
      finished = true;
      if (lastInterim) h.onResult([lastInterim]);
      else h.onError('no-speech');
    }
    h.onEnd();
  };

  stopSpeaking(); // don't let the app's own voice be recognized
  try {
    rec.start();
  } catch {
    finished = true;
    h.onError('other');
    h.onEnd();
  }
  return () => rec.stop();
}
