// The only file that talks to the Gemini API.
import { ApiError, GoogleGenAI, ThinkingLevel } from '@google/genai';
import { SYSTEM_PROMPT, levelNote } from './prompt';
import { ModelReply, type TutorRequest } from './schema';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
/** Tried once when the main model is overloaded, failing or too slow. Empty string disables it. */
export const GEMINI_BACKUP_MODEL = process.env.GEMINI_BACKUP_MODEL ?? 'gemini-3.1-flash-lite';

/** Worth trying the backup model: rate limit, server error, timeout or network failure (not a bad request or key). */
const shouldTryBackup = (err: unknown) => !(err instanceof ApiError) || err.status === 429 || err.status >= 500;

// Time budget (Gemini's minimum deadline is 10 s): main model 2 tries × 10 s, backup 1 try × 12 s
// → done within ~33 s; the app waits 40 s.
const MAIN_HTTP = { timeout: 10_000, retryOptions: { attempts: 2, initialDelay: 0.5, maxDelay: 1 } };
const BACKUP_HTTP = { timeout: 12_000, retryOptions: { attempts: 1 } };

/** ModelReply as JSON Schema, using only keywords the Gemini API documents (nullable via a type array). */
export const REPLY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    he: { type: 'string', description: 'The tutor reply in short, simple spoken Hebrew' },
    ar: { type: 'string', description: 'Arabic translation / explanation of the reply' },
    correction: {
      type: ['object', 'null'],
      description: "Gentle fix of the student's last Hebrew message, or null if none is needed",
      properties: {
        said: { type: 'string', description: "The student's Hebrew phrase that had a mistake" },
        better: { type: 'string', description: 'The natural, correct Hebrew' },
        noteAr: { type: 'string', description: 'A short, kind explanation in Arabic' },
      },
      required: ['said', 'better', 'noteAr'],
    },
  },
  required: ['he', 'ar', 'correction'],
} as const;

let ai: GoogleGenAI | null = null;
const getAi = () =>
  (ai ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  }));

/** Returns the parsed reply, or null if the model blocked the request or the output didn't parse. */
export async function askGemini(req: TutorRequest): Promise<ModelReply | null> {
  const contents = req.messages.map((m, i) => ({
    role: m.role === 'student' ? 'user' : 'model',
    parts: [{ text: i === 0 ? `${levelNote(req.level)}\n${m.text}` : m.text }],
  }));

  const started = Date.now();
  const generate = (model: string, httpOptions: typeof MAIN_HTTP | typeof BACKUP_HTTP) =>
    getAi().models.generateContent({
      model,
      contents,
      config: {
        httpOptions,
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseJsonSchema: REPLY_JSON_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }, // a chat reply doesn't need deep reasoning; keeps latency down
      },
    });

  let res;
  try {
    res = await generate(GEMINI_MODEL, MAIN_HTTP);
  } catch (err) {
    if (!shouldTryBackup(err) || !GEMINI_BACKUP_MODEL || GEMINI_BACKUP_MODEL === GEMINI_MODEL) throw err;
    const reason = err instanceof ApiError ? err.status : (err as Error).name;
    console.log(JSON.stringify({ event: 'gemini_backup', from: GEMINI_MODEL, to: GEMINI_BACKUP_MODEL, reason }));
    res = await generate(GEMINI_BACKUP_MODEL, BACKUP_HTTP);
  }

  // Usage only — never log what students wrote.
  const u = res.usageMetadata;
  console.log(
    JSON.stringify({
      event: 'gemini',
      ms: Date.now() - started,
      model: res.modelVersion ?? GEMINI_MODEL,
      finish: res.candidates?.[0]?.finishReason,
      blocked: res.promptFeedback?.blockReason,
      input: u?.promptTokenCount,
      output: u?.candidatesTokenCount,
      thoughts: u?.thoughtsTokenCount,
      cached: u?.cachedContentTokenCount,
    }),
  );

  const text = res.text; // undefined when the prompt or reply was blocked
  if (!text) return null;
  try {
    return ModelReply.parse(JSON.parse(text));
  } catch {
    return null;
  }
}

/** Lists the models this key can use (npm run models). */
export async function listGeminiModels(): Promise<string[]> {
  const names: string[] = [];
  for await (const m of await getAi().models.list()) if (m.name) names.push(m.name.replace(/^models\//, ''));
  return names;
}

export { ApiError as GeminiApiError };
