// Picks who answers: Claude, Gemini, or the free keyword mock.
import { Anthropic, MODEL as CLAUDE_MODEL, askClaude } from './claude';
import { GEMINI_MODEL, GeminiApiError, askGemini } from './gemini';
import type { GenerateOptions } from './llm';

export type Provider = 'mock' | 'claude' | 'gemini';

/**
 * AI_MOCK=1 forces mock. AI_PROVIDER=claude|gemini picks one explicitly (needs its key).
 * Otherwise: whichever key is set (Claude if both), else mock.
 */
export function getProvider(): Provider {
  const env = process.env;
  if (env.AI_MOCK === '1') return 'mock';
  const has = { claude: !!env.ANTHROPIC_API_KEY, gemini: !!env.GEMINI_API_KEY };
  const chosen = env.AI_PROVIDER;
  if (chosen === 'claude' || chosen === 'gemini') return has[chosen] ? chosen : 'mock';
  if (has.claude) return 'claude';
  if (has.gemini) return 'gemini';
  return 'mock';
}

export function modelName(provider = getProvider()): string | null {
  return provider === 'claude' ? CLAUDE_MODEL : provider === 'gemini' ? GEMINI_MODEL : null;
}

export function generate<T>(provider: Exclude<Provider, 'mock'>, o: GenerateOptions<T>): Promise<T | null> {
  return provider === 'claude' ? askClaude(o) : askGemini(o);
}

const count = (s: string, re: RegExp) => s.match(re)?.length ?? 0;
const HEBREW = /[א-ת]/g;
const ARABIC = /[ء-ي]/g;

/**
 * Catches garbled output, e.g. Arabic written in Hebrew letters: "he" must be mostly Hebrew letters and
 * "ar" mostly Arabic letters (quoting a Hebrew word inside the Arabic is fine).
 */
export function scriptsLookRight(r: { he: string; ar: string }): boolean {
  return count(r.he, HEBREW) > count(r.he, ARABIC) && count(r.ar, ARABIC) > count(r.ar, HEBREW);
}

const plain = (s: string) => s.replace(/[\u0591-\u05C7]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** A "correction" that changes nothing is noise (models sometimes return one to praise a correct sentence). */
export function dropNoopCorrection<T extends { correction: { said: string; better: string } | null }>(r: T): T {
  return r.correction && plain(r.correction.said) === plain(r.correction.better) ? { ...r, correction: null } : r;
}

/** generate(), asking once more if the reply comes back garbled. Null if both tries fail. */
export async function generateChecked<T extends { he: string; ar: string }>(
  provider: Exclude<Provider, 'mock'>,
  o: GenerateOptions<T>,
): Promise<T | null> {
  const first = await generate(provider, o);
  if (!first || scriptsLookRight(first)) return first && fixCorrection(first);
  console.log(JSON.stringify({ event: 'garbled_reply', label: o.label, provider, retry: true }));
  const second = await generate(provider, o);
  return second && scriptsLookRight(second) ? fixCorrection(second) : null;
}

const fixCorrection = <T,>(r: T): T =>
  r && typeof r === 'object' && 'correction' in r ? (dropNoopCorrection(r as never) as T) : r;

/** HTTP status for a provider error: retryable (rate limit, overload, network) → 503, other API errors → 502. */
export function providerErrorStatus(err: unknown): number | null {
  if (err instanceof Anthropic.RateLimitError) return 503;
  if (err instanceof Anthropic.APIConnectionError) return 503;
  if (err instanceof Anthropic.InternalServerError) return 503;
  if (err instanceof Anthropic.APIError) return 502;
  if (err instanceof GeminiApiError) return err.status === 429 || err.status >= 500 ? 503 : 502;
  return null;
}
