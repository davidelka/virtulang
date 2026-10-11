// Client for the AI tutor server (ai-server/). Returns null when it's unreachable,
// so the bot can fall back to the local keyword replies.
import type { CEFR, TutorCorrection, VoiceGender } from '../types';

export interface TutorTurn {
  role: 'student' | 'tutor';
  text: string;
}

export interface TutorReply {
  he: string;
  ar: string;
  correction: TutorCorrection | null;
  source: 'claude' | 'gemini' | 'mock' | 'fallback';
}

const BASE = import.meta.env.VITE_AI_URL ?? ''; // dev: proxied by Vite to localhost:8787
const TIMEOUT_MS = 40_000; // the server answers (or gives up) within ~33 s

/** An empty `messages` asks the tutor to open the conversation. */
export async function askTutor(
  level: CEFR,
  messages: TutorTurn[],
  addressAs: VoiceGender | null,
): Promise<TutorReply | null> {
  try {
    const res = await fetch(`${BASE}/api/tutor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, messages, addressAs: addressAs ?? undefined }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as TutorReply;
  } catch {
    return null;
  }
}

export interface RoleplayServerTurn {
  he: string;
  ar: string;
  correction: TutorCorrection | null;
  goalsMet: string[];
  finished: boolean;
  level: CEFR;
  source: TutorReply['source'];
}

/** One role-play turn from the AI server; null when it's unreachable (the game then runs scripted). */
export async function askRoleplay(
  activityId: string,
  level: CEFR,
  met: string[],
  messages: TutorTurn[],
  addressAs: VoiceGender | null,
): Promise<RoleplayServerTurn | null> {
  try {
    const res = await fetch(`${BASE}/api/roleplay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId, level, met, messages, addressAs: addressAs ?? undefined }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as RoleplayServerTurn;
  } catch {
    return null;
  }
}
