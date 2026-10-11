import botJson from '../content/botReplies.json';
import type { BotData, BotText } from '../types';
import { dictionary } from './content';

const bot = botJson as BotData;

// Lowercase, drop Hebrew niqqud, Arabic diacritics, and punctuation; unify alef forms.
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[֑-ׇً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[?؟!.,:;«»"'׳״-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const has = (text: string, keywords: string[]) => keywords.some((k) => text.includes(norm(k)));
const fill = (t: BotText, w: { he: string; ar: string }): BotText => ({
  he: t.he.replace('{he}', w.he).replace('{ar}', w.ar),
  ar: t.ar.replace('{he}', w.he).replace('{ar}', w.ar),
});

export const botWelcome = bot.welcome;

export function botReply(input: string): BotText {
  const text = norm(input);
  if (has(text, bot.howToSayKeywords)) {
    const w = dictionary.find((d) => text.includes(norm(d.ar)));
    return w ? fill(bot.howToSay, w) : bot.unknownWord;
  }
  if (has(text, bot.translateKeywords)) {
    const w = dictionary.find((d) => text.includes(norm(d.he)));
    return w ? fill(bot.translate, w) : bot.unknownWord;
  }
  const rule = bot.rules.find((r) => has(text, r.keywords));
  return rule ?? bot.fallback;
}
