// Picks who answers: Claude, Gemini, or the free keyword mock.
import { Anthropic, MODEL as CLAUDE_MODEL, askClaude } from './claude';
import { GEMINI_MODEL, GeminiApiError, askGemini } from './gemini';
import type { ModelReply, TutorRequest } from './schema';

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

export function askModel(provider: Exclude<Provider, 'mock'>, req: TutorRequest): Promise<ModelReply | null> {
  return provider === 'claude' ? askClaude(req) : askGemini(req);
}

/** HTTP status for a provider error: retryable (rate limit, overload, network) → 503, other API errors → 502. */
export function providerErrorStatus(err: unknown): number | null {
  if (err instanceof Anthropic.RateLimitError) return 503;
  if (err instanceof Anthropic.APIConnectionError) return 503;
  if (err instanceof Anthropic.InternalServerError) return 503;
  if (err instanceof Anthropic.APIError) return 502;
  if (err instanceof GeminiApiError) return err.status === 429 || err.status >= 500 ? 503 : 502;
  return null;
}
