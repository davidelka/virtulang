import type { Activity, ActivityResult, Reward } from '../types';

export const THREE_STAR_BONUS = 10;
export const SPOKEN_CORRECT_POINTS = 5;
export const SPOKEN_ATTEMPT_POINTS = 2;
export const HELP_PENALTY = 5;
export const STREAK_POINTS = 5;

export const EMPTY_RESULT: ActivityResult = { mistakes: 0, helpUsed: 0, spokenCorrect: 0, spokenAttempts: 0 };

export function starsFor(result: ActivityResult): number {
  const slips = result.mistakes + 2 * result.helpUsed;
  if (slips === 0) return 3;
  if (slips <= 2) return 2;
  return 1; // finishing always earns a star: points reward effort
}

export function rewardFor(activity: Activity, result: ActivityResult): Reward {
  const stars = starsFor(result);
  const base = activity.points;
  // Help costs points, but never more than half the activity's points.
  const helpPenalty = Math.min(result.helpUsed * HELP_PENALTY, Math.floor(base / 2));
  const bonus = stars === 3 ? THREE_STAR_BONUS : 0;
  const spokenCorrect = result.spokenCorrect * SPOKEN_CORRECT_POINTS;
  const spokenAttempts = result.spokenAttempts * SPOKEN_ATTEMPT_POINTS;
  return {
    stars,
    base,
    helpPenalty,
    bonus,
    spokenCorrect,
    spokenAttempts,
    total: base - helpPenalty + bonus + spokenCorrect + spokenAttempts,
  };
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Returns the new streak, or null if today was already counted. */
export function nextStreak(lastVisit: string | null, streak: number, now = new Date()): number | null {
  const today = dayKey(now);
  if (lastVisit === today) return null;
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000));
  return lastVisit === yesterday ? streak + 1 : 1;
}

export const todayKey = () => dayKey(new Date());
