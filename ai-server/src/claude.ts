// The only file that talks to the Claude API.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { GenerateOptions } from './llm';

export const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

/** Returns the parsed reply, or null if the model refused or the output didn't parse. */
export async function askClaude<T>(o: GenerateOptions<T>): Promise<T | null> {
  const started = Date.now();
  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default', // on a safety decline, the API retries on a suitable fallback model
    cache_control: { type: 'ephemeral' },
    system: o.system,
    messages: o.turns.map((t) => ({ role: t.role, content: t.text })),
    output_config: { effort: 'low', format: betaZodOutputFormat(o.schema) },
  });

  // Usage only — never log what students wrote.
  console.log(
    JSON.stringify({
      event: 'claude',
      label: o.label,
      ms: Date.now() - started,
      model: res.model,
      stop: res.stop_reason,
      input: res.usage.input_tokens,
      output: res.usage.output_tokens,
      cacheRead: res.usage.cache_read_input_tokens,
    }),
  );

  if (res.stop_reason === 'refusal') return null;
  return (res.parsed_output as T | null) ?? null;
}

export { Anthropic };
