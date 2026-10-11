import { botWelcome } from '../../src/lib/bot';
import { fallbackReply, mockReply } from './mock';
import { askModel, getProvider } from './provider';
import { MAX_HISTORY, type ModelReply, type TutorReply, type TutorRequest } from './schema';

/** Stands in for the student when the tutor speaks first (models need a user turn first). */
export const START_SIGNAL =
  '[The student just opened the chat. Greet them in one short sentence and ask one simple question to start talking.]';

/**
 * Keeps the last MAX_HISTORY messages. If that leaves the tutor speaking first (the tutor opened the
 * conversation, or older turns were cut), the start signal goes in front so the tutor's question keeps its context.
 */
export function trimHistory(messages: TutorRequest['messages']): TutorRequest['messages'] {
  const recent = messages.slice(-MAX_HISTORY);
  return recent[0]?.role === 'student' ? recent : [{ role: 'student', text: START_SIGNAL }, ...recent];
}

const count = (s: string, re: RegExp) => s.match(re)?.length ?? 0;
const HEBREW = /[\u05D0-\u05EA]/g;
const ARABIC = /[\u0621-\u064A]/g;

/**
 * Catches garbled output, e.g. Arabic written in Hebrew letters: "he" must be mostly Hebrew letters and
 * "ar" mostly Arabic letters (quoting a Hebrew word inside the Arabic is fine).
 */
export function scriptsLookRight(r: ModelReply): boolean {
  return count(r.he, HEBREW) > count(r.he, ARABIC) && count(r.ar, ARABIC) > count(r.ar, HEBREW);
}

export async function tutorReply(input: TutorRequest): Promise<TutorReply> {
  const req = { ...input, messages: trimHistory(input.messages) };
  const provider = getProvider();
  if (provider === 'mock') {
    if (input.messages.length === 0) return { ...botWelcome, correction: null, source: 'mock' };
    return { ...mockReply(req), source: 'mock' };
  }
  let reply = await askModel(provider, req);
  if (reply && !scriptsLookRight(reply)) {
    console.log(JSON.stringify({ event: 'garbled_reply', provider, retry: true }));
    reply = await askModel(provider, req);
    if (reply && !scriptsLookRight(reply)) reply = null;
  }
  return reply ? { ...reply, source: provider } : { ...fallbackReply(), source: 'fallback' };
}
