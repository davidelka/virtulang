import { askClaude } from './claude';
import { fallbackReply, mockReply } from './mock';
import { MAX_HISTORY, type TutorReply, type TutorRequest } from './schema';

export type Mode = 'mock' | 'claude';

export const getMode = (): Mode =>
  process.env.AI_MOCK === '1' || !process.env.ANTHROPIC_API_KEY ? 'mock' : 'claude';

/** Keeps the last MAX_HISTORY messages and makes sure the conversation starts with the student. */
export function trimHistory(messages: TutorRequest['messages']): TutorRequest['messages'] {
  const recent = messages.slice(-MAX_HISTORY);
  const firstStudent = recent.findIndex((m) => m.role === 'student');
  return recent.slice(firstStudent);
}

export async function tutorReply(input: TutorRequest): Promise<TutorReply> {
  const req = { ...input, messages: trimHistory(input.messages) };
  if (getMode() === 'mock') return { ...mockReply(req), source: 'mock' };
  const reply = await askClaude(req);
  return reply ? { ...reply, source: 'claude' } : { ...fallbackReply(), source: 'fallback' };
}
