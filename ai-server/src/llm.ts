import type { z } from 'zod';

/** A provider-neutral structured-output request. */
export interface GenerateOptions<T> {
  /** Frozen instructions (cacheable). */
  system: string;
  /** Conversation, oldest first; must start with a user turn. */
  turns: { role: 'user' | 'assistant'; text: string }[];
  /** Validates the reply (and drives Claude's structured output). */
  schema: z.ZodType<T>;
  /** The same shape as JSON Schema, using only keywords Gemini documents. */
  jsonSchema: object;
  /** For logs. */
  label: string;
}
