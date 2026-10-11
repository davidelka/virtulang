import type { SpeechSpeed, VoiceGender } from '../types';

// ---------- Text to speech ----------
// First choice: the AI server's natural Hebrew voice (Gemini TTS, cached on the server).
// Fallback: the browser's own voice (fine on Android; robotic or missing on desktop Linux).

const hasBrowserVoice = typeof window !== 'undefined' && 'speechSynthesis' in window;
export const canSpeak = typeof window !== 'undefined' && (typeof Audio !== 'undefined' || hasBrowserVoice);

const BASE = import.meta.env.VITE_AI_URL ?? '';
const SERVER_TIMEOUT_MS = 20_000; // a new sentence takes ~5-7 s to record; cached ones are instant
const SERVER_RETRY_AFTER_MS = 60_000; // after a failure, use the browser voice for a minute
const SERVER_MAX_CHARS = 300;

let serverDownUntil = 0;
let currentAudio: HTMLAudioElement | null = null;
let speakId = 0; // a newer speakHebrew() or stopSpeaking() cancels the older one

/**
 * Speaking speed, chosen by the student. `audio` scales the server recordings (recorded in a slow,
 * clear style) at playback, so changing it costs nothing; `browser` is the fallback voice's rate.
 */
const SPEEDS: Record<SpeechSpeed, { audio: number; browser: number }> = {
  slow: { audio: 1, browser: 0.7 },
  normal: { audio: 1.15, browser: 0.85 },
  fast: { audio: 1.3, browser: 1 },
};
let speed: SpeechSpeed = 'normal';

export function setSpeechSpeed(s: SpeechSpeed) {
  speed = s;
  if (currentAudio) currentAudio.playbackRate = SPEEDS[s].audio;
}

/** Speaks Hebrew text. Resolves when done, stopped, or if no voice is available. */
export async function speakHebrew(text: string, gender: VoiceGender): Promise<void> {
  stopSpeaking();
  const id = ++speakId;
  const serverOk = Date.now() >= serverDownUntil && text.length <= SERVER_MAX_CHARS && /[\u05D0-\u05EA]/.test(text);
  if (serverOk) {
    const result = await playServerVoice(text, gender, id);
    if (result !== 'failed') return;
    serverDownUntil = Date.now() + SERVER_RETRY_AFTER_MS;
  }
  if (id === speakId) await browserSpeak(text, gender);
}

export function stopSpeaking() {
  speakId++;
  currentAudio?.pause();
  currentAudio = null;
  if (hasBrowserVoice) speechSynthesis.cancel();
}

async function playServerVoice(text: string, gender: VoiceGender, id: number): Promise<'played' | 'cancelled' | 'failed'> {
  try {
    const res = await fetch(`${BASE}/api/tts?voice=${gender}&text=${encodeURIComponent(text)}`, {
      signal: AbortSignal.timeout(SERVER_TIMEOUT_MS),
    });
    if (!res.ok) return 'failed';
    const blob = await res.blob();
    if (id !== speakId) return 'cancelled';
    const src = URL.createObjectURL(blob);
    const audio = new Audio(src);
    audio.playbackRate = SPEEDS[speed].audio; // pitch is preserved by default
    currentAudio = audio;
    try {
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onpause = () => resolve(); // stopSpeaking()
        audio.onerror = () => reject(new Error('audio playback failed'));
        audio.play().catch(reject);
      });
    } finally {
      URL.revokeObjectURL(src);
    }
    return 'played';
  } catch {
    return id === speakId ? 'failed' : 'cancelled';
  }
}

let voices: SpeechSynthesisVoice[] = [];
if (hasBrowserVoice) {
  const load = () => (voices = speechSynthesis.getVoices());
  load();
  speechSynthesis.addEventListener?.('voiceschanged', load);
}

// Voice names rarely state gender; these cover common Hebrew voices (Carmit, Asaf, espeak's female1/male1).
const NAME_HINT: Record<VoiceGender, RegExp> = { female: /carmit|female|woman/i, male: /asaf|\bmale|\bman\b/i };

function browserSpeak(text: string, gender: VoiceGender): Promise<void> {
  if (!hasBrowserVoice) return Promise.resolve();
  const he = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('he') || v.lang.startsWith('iw'));
  const named = he.find((v) => NAME_HINT[gender].test(v.name));
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'he-IL';
  u.voice = named ?? he[0] ?? null;
  u.rate = SPEEDS[speed].browser;
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
