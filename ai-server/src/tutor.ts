import { fallbackReply, mockReply } from './mock';
import { askModel, getProvider } from './provider';
import { MAX_HISTORY, type TutorReply, type TutorRequest } from './schema';

/** Keeps the last MAX_HISTORY messages and makes sure the conversation starts with the student. */
export function trimHistory(messages: TutorRequest['messages']): TutorRequest['messages'] {
  const recent = messages.slice(-MAX_HISTORY);
  const firstStudent = recent.findIndex((m) => m.role === 'student');
  return recent.slice(firstStudent);
}

export async function tutorReply(input: TutorRequest): Promise<TutorReply> {
  const req = { ...input, messages: trimHistory(input.messages) };
  const provider = getProvider();
  if (provider === 'mock') return { ...mockReply(req), source: 'mock' };
  const reply = await askModel(provider, req);
  return reply ? { ...reply, source: provider } : { ...fallbackReply(), source: 'fallback' };
}
