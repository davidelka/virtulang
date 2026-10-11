// Role-play logic shared by the app (offline fallback) and ai-server (mock mode and goal bookkeeping).
import type { CEFR, RoleplayContent, RoleplayGoal } from '../types';

const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2'];

/** The goals for the student's level, or for the closest lower level that has goals. */
export function goalsFor(content: RoleplayContent, level: CEFR): { level: CEFR; goals: RoleplayGoal[] } {
  for (let i = LEVELS.indexOf(level); i >= 0; i--) {
    const goals = content.levels[LEVELS[i]];
    if (goals?.length) return { level: LEVELS[i], goals };
  }
  const first = LEVELS.find((l) => content.levels[l]?.length) ?? 'A1';
  return { level: first, goals: content.levels[first] ?? [] };
}

export interface RoleplayTurn {
  he: string;
  ar: string;
  /** Goal ids the student's last message covered. */
  goalsMet: string[];
  finished: boolean;
}

/**
 * No-AI version: the character asks the goals in order and accepts any answer.
 * `studentText` null = the opening line.
 */
export function scriptedTurn(
  content: RoleplayContent,
  goals: RoleplayGoal[],
  met: string[],
  studentText: string | null,
): RoleplayTurn {
  const open = goals.filter((g) => !met.includes(g.id));
  const goalsMet = studentText?.trim() && open.length ? [open[0].id] : [];
  const next = open.find((g) => !goalsMet.includes(g.id));
  if (!next) return { he: content.closingHe, ar: content.closingAr, goalsMet, finished: true };
  if (studentText === null)
    return { he: `${content.greetingHe} ${next.askHe}`, ar: `${content.greetingAr} ${next.askAr}`, goalsMet, finished: false };
  return { he: `יופי! ${next.askHe}`, ar: `رائع! ${next.askAr}`, goalsMet, finished: false };
}
