// Mock mode: the app's existing keyword bot (src/lib/bot.ts), wrapped in the AI contract.
import { botReply } from '../../src/lib/bot';
import type { ModelReply, TutorRequest } from './schema';

export function mockReply(req: TutorRequest): ModelReply {
  const { he, ar } = botReply(req.messages.at(-1)!.text);
  return { he, ar, correction: null };
}

/** Shown when the model refuses or returns something unusable. */
export function fallbackReply(): ModelReply {
  const { he, ar } = botReply(''); // empty input → the bot's generic "ask me like this" reply
  return { he, ar, correction: null };
}
