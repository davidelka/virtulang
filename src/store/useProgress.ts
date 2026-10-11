import { useSyncExternalStore } from 'react';
import type { Activity, ActivityResult, ItemSlot, Progress, Reward, VoiceGender } from '../types';
import { getShopItem } from '../lib/content';
import { nextStreak, rewardFor, STREAK_POINTS, todayKey } from './scoring';

const KEY = 'virtulang:progress:v1';

const initial: Progress = {
  name: '',
  classCode: '',
  avatarId: null,
  addressAs: null,
  level: 'A2', // mock: no placement test yet
  points: 0,
  stars: {},
  lastRegionId: null,
  streak: 0,
  lastVisit: null,
  equipped: {},
  voice: 'female',
};

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...initial, ...JSON.parse(raw) } : initial;
  } catch {
    return initial;
  }
}

let state = load();
const listeners = new Set<() => void>();

function set(update: (p: Progress) => Progress) {
  state = update(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage unavailable: keep in memory only
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, () => state);
}

export const actions = {
  login(name: string, classCode: string) {
    set((p) => ({ ...p, name, classCode }));
  },

  chooseAvatar(avatarId: string, addressAs: VoiceGender) {
    set((p) => ({ ...p, avatarId, addressAs }));
  },

  setAddressAs(addressAs: VoiceGender) {
    set((p) => ({ ...p, addressAs }));
  },

  visitRegion(regionId: string) {
    if (state.lastRegionId !== regionId) set((p) => ({ ...p, lastRegionId: regionId }));
  },

  checkStreak() {
    const streak = nextStreak(state.lastVisit, state.streak);
    if (streak === null) return;
    set((p) => ({ ...p, streak, lastVisit: todayKey(), points: p.points + STREAK_POINTS }));
  },

  completeActivity(activity: Activity, result: ActivityResult): Reward {
    const reward = rewardFor(activity, result);
    set((p) => ({
      ...p,
      points: p.points + reward.total,
      stars: { ...p.stars, [activity.id]: Math.max(p.stars[activity.id] ?? 0, reward.stars) },
    }));
    return reward;
  },

  toggleItem(itemId: string) {
    const item = getShopItem(itemId);
    if (!item || state.points < item.unlockAt) return;
    set((p) => {
      const slot: ItemSlot = item.slot;
      const equipped = { ...p.equipped };
      if (equipped[slot] === itemId) delete equipped[slot];
      else equipped[slot] = itemId;
      return { ...p, equipped };
    });
  },

  setVoice(voice: VoiceGender) {
    set((p) => ({ ...p, voice }));
  },

  logout() {
    set(() => initial);
  },

  /** Dev/demo helper: a logged-in student with some progress. */
  seedDemo() {
    set(() => ({
      ...initial,
      name: 'سلامة',
      classCode: '1234',
      avatarId: 'a1',
      addressAs: 'female',
      points: 85,
      stars: { 'bus-ticket': 3, 'food-words': 2 },
      lastRegionId: 'city',
      streak: 3,
      lastVisit: todayKey(),
    }));
  },
};
