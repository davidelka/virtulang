export type CEFR = 'A1' | 'A2' | 'B1' | 'B2';

export interface Region {
  id: string;
  nameAr: string;
  nameHe: string;
  x: number;
  y: number;
  color: string;
  icon: string;
  requiredLevel?: CEFR;
}

export interface PointOfInterest {
  id: string;
  regionId: string;
  nameAr: string;
  nameHe: string;
  x: number;
  y: number;
  activityIds: string[];
}

export type ActivityTemplate = 'dialogue' | 'match' | 'roleplay';

export interface Activity {
  id: string;
  poiId: string;
  template: ActivityTemplate;
  level: CEFR;
  titleAr: string;
  titleHe: string;
  points: number;
  content: DialogueContent | MatchContent | RoleplayContent;
  status: 'approved';
  createdBy: 'team';
}

export interface DialogueOption {
  he: string;
  ar: string;
  correct: boolean;
}

export interface DialogueTurn {
  speaker: string;
  lineHe: string;
  /** Acceptable spoken answers (Hebrew). A turn without them is a closing line. */
  expectedAnswers?: string[];
  /** What the student should say, in Arabic. */
  hintAr?: string;
  /** Fallback only: shown behind "need help?" or when speech isn't available. */
  options?: DialogueOption[];
}

export interface DialogueContent {
  speakerGender?: VoiceGender;
  turns: DialogueTurn[];
}

/** One thing the student should talk about in a role-play. */
export interface RoleplayGoal {
  id: string;
  labelAr: string; // checklist label
  labelHe: string;
  askHe: string; // how the character asks about it (used by the scripted fallback)
  askAr: string;
}

export interface RoleplayContent {
  character: {
    nameHe: string;
    nameAr: string;
    emoji: string;
    gender: VoiceGender;
    roleHe: string; // who the character is, for the AI
  };
  scenarioAr: string;
  scenarioHe: string;
  greetingHe: string;
  greetingAr: string;
  closingHe: string;
  closingAr: string;
  /** Goals per level; the student gets the set for their level (or the closest lower one). */
  levels: Partial<Record<CEFR, RoleplayGoal[]>>;
}

export interface MatchContent {
  pairs: { he: string; ar: string }[];
}

export interface ActivityResult {
  mistakes: number;
  /** Turns answered by picking an option after asking for help. */
  helpUsed: number;
  spokenCorrect: number;
  /** Spoken attempts that didn't match. */
  spokenAttempts: number;
}

export interface Reward {
  stars: number;
  base: number;
  helpPenalty: number;
  bonus: number;
  spokenCorrect: number;
  spokenAttempts: number;
  total: number;
}

export interface Avatar {
  id: string;
  emoji: string;
}

export type ItemSlot = 'bg' | 'frame' | 'badge';

export interface ShopItem {
  id: string;
  slot: ItemSlot;
  nameAr: string;
  nameHe: string;
  unlockAt: number;
  value: string; // CSS background / border color / emoji, by slot
}

export type VoiceGender = 'male' | 'female';

export interface Progress {
  name: string;
  classCode: string;
  avatarId: string | null;
  /** How Hebrew addresses the student (אתה / את). Chosen by the student, never guessed. */
  addressAs: VoiceGender | null;
  level: CEFR;
  points: number;
  stars: Record<string, number>;
  lastRegionId: string | null;
  streak: number;
  lastVisit: string | null;
  equipped: Partial<Record<ItemSlot, string>>;
  voice: VoiceGender;
}

export interface TutorCorrection {
  said: string;
  better: string;
  noteAr: string;
}

export interface BotText {
  he: string;
  ar: string;
}

export interface BotRule extends BotText {
  keywords: string[];
}

export interface BotData {
  welcome: BotText;
  fallback: BotText;
  howToSay: BotText;
  translate: BotText;
  unknownWord: BotText;
  howToSayKeywords: string[];
  translateKeywords: string[];
  rules: BotRule[];
}

export interface MockStudent {
  id: string;
  name: string;
  level: CEFR;
  points: number;
  lastActivityId: string;
  hoursAgo: number;
  minutesThisWeek: number;
}
