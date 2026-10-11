// Hebrew text-to-speech with Gemini TTS. Every recording is cached on disk, so a sentence costs
// one API call ever; fixed content (dialogue lines, greetings) then plays instantly.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

export const TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
export const TTS_BACKUP_MODEL = process.env.GEMINI_TTS_BACKUP_MODEL ?? 'gemini-3.8-flash-lite-tts';
const VOICES = {
  female: process.env.GEMINI_TTS_VOICE_FEMALE || 'Kore',
  male: process.env.GEMINI_TTS_VOICE_MALE || 'Puck',
};
const STYLE =
  'speaking slowly and clearly, warm and friendly, like a patient teacher talking to a teenager who is learning Hebrew';
const CACHE_DIR = path.resolve(import.meta.dirname, '../.cache/tts');
export const MAX_TTS_CHARS = 300;

export type Voice = keyof typeof VOICES;

export const ttsAvailable = () => process.env.AI_MOCK !== '1' && !!process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
const getAi = () => (ai ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

/** Same text + voice + settings → same file. */
const cacheKey = (text: string, voice: Voice) =>
  createHash('sha256').update([TTS_MODEL, VOICES[voice], STYLE, text].join('\n')).digest('hex');

async function generate(model: string, text: string, voice: Voice): Promise<Buffer> {
  const res = await getAi().interactions.create({
    model,
    input: [{ type: 'user_input', content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style: STYLE }] }] }],
    response_format: { type: 'audio' },
    generation_config: { speech_config: [{ voice: VOICES[voice] }] },
  });
  const data = res.output_audio?.data;
  if (!data) throw new Error('TTS response had no audio');
  return Buffer.from(data, 'base64'); // WAV: 24 kHz, mono, 16-bit
}

const inFlight = new Map<string, Promise<Buffer>>();

/** WAV audio for the text; from the disk cache when available. */
export function speak(text: string, voice: Voice): Promise<Buffer> {
  const key = cacheKey(text, voice);
  const file = path.join(CACHE_DIR, `${key}.wav`);
  const pending = inFlight.get(key);
  if (pending) return pending; // the same sentence requested twice at once → one API call

  const job = (async () => {
    try {
      return await readFile(file);
    } catch {
      // not cached yet
    }
    const started = Date.now();
    let audio: Buffer;
    let model = TTS_MODEL;
    try {
      audio = await generate(model, text, voice);
    } catch (err) {
      if (!TTS_BACKUP_MODEL || TTS_BACKUP_MODEL === TTS_MODEL) throw err;
      model = TTS_BACKUP_MODEL;
      audio = await generate(model, text, voice);
    }
    console.log(JSON.stringify({ event: 'tts', model, voice, chars: text.length, ms: Date.now() - started }));
    await mkdir(CACHE_DIR, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, audio);
    await rename(tmp, file); // atomic: never serve a half-written file
    return audio;
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, job);
  return job;
}
