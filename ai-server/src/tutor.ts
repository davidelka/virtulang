import { botWelcome } from '../../src/lib/bot';
import { fallbackReply, mockReply } from './mock';
import { SYSTEM_PROMPT, levelNote } from './prompt';
import { generateChecked, getProvider } from './provider';
import { MAX_HISTORY, ModelReply, REPLY_JSON_SCHEMA, type TutorReply, type TutorRequest } from './schema';

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

export async function tutorReply(input: TutorRequest): Promise<TutorReply> {
  const req = { ...input, messages: trimHistory(input.messages) };
  const provider = getProvider();
  if (provider === 'mock') {
    if (input.messages.length === 0) return { ...botWelcome, correction: null, source: 'mock' };
    return { ...mockReply(req), source: 'mock' };
  }
  const reply = await generateChecked(provider, {
    label: 'tutor',
    system: SYSTEM_PROMPT,
    // The level goes on the first turn so the earlier prefix stays identical across turns (cache-friendly).
    turns: req.messages.map((m, i) => ({
      role: m.role === 'student' ? 'user' : 'assistant',
      text: i === 0 ? `${levelNote(req.level)}\n${m.text}` : m.text,
    })),
    schema: ModelReply,
    jsonSchema: REPLY_JSON_SCHEMA,
  });
  return reply ? { ...reply, source: provider } : { ...fallbackReply(), source: 'fallback' };
}
