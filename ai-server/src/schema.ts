import { z } from 'zod';

// The contract between the app and the AI tutor.

export const MAX_HISTORY = 20;
export const MAX_TEXT = 500;

export const Level = z.enum(['A1', 'A2', 'B1', 'B2']);
/** How to address the student in Hebrew, as they chose in the app. Absent = unknown (use the plural). */
export const AddressAs = z.enum(['male', 'female']).optional();

export const ChatMessage = z.object({
  role: z.enum(['student', 'tutor']),
  text: z.string().trim().min(1).max(MAX_TEXT),
});

export const TutorRequest = z
  .object({
    level: Level,
    addressAs: AddressAs,
    // Empty = start the conversation (the tutor greets and asks a question).
    // Longer histories are accepted and trimmed to the last MAX_HISTORY messages.
    messages: z.array(ChatMessage).max(100),
  })
  .refine((r) => r.messages.length === 0 || r.messages.at(-1)?.role === 'student', {
    message: 'the last message must be from the student',
    path: ['messages'],
  });

/** What Claude must return (structured output). */
export const ModelReply = z.object({
  he: z.string().describe('The tutor reply in short, simple spoken Hebrew'),
  ar: z.string().describe('Arabic translation / explanation of the reply'),
  correction: z
    .object({
      said: z.string().describe("The student's Hebrew phrase that had a mistake"),
      better: z.string().describe('The natural, correct Hebrew'),
      noteAr: z.string().describe('A short, kind explanation in Arabic'),
    })
    .nullable()
    .describe("Gentle fix of the student's last Hebrew message, or null if none is needed"),
});

export const TutorReply = ModelReply.extend({
  source: z.enum(['claude', 'gemini', 'mock', 'fallback']),
});

export type TutorRequest = z.infer<typeof TutorRequest>;
export type ModelReply = z.infer<typeof ModelReply>;
export type TutorReply = z.infer<typeof TutorReply>;

/** ModelReply as JSON Schema for Gemini, using only documented keywords (nullable via a type array). */
const CORRECTION_JSON = {
  type: ['object', 'null'],
  description: "Gentle fix of the student's last Hebrew message, or null if none is needed",
  properties: {
    said: { type: 'string', description: "The student's Hebrew phrase that had a mistake" },
    better: { type: 'string', description: 'The natural, correct Hebrew' },
    noteAr: { type: 'string', description: 'A short, kind explanation in Arabic' },
  },
  required: ['said', 'better', 'noteAr'],
} as const;

export const REPLY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    he: { type: 'string', description: 'The tutor reply in short, simple spoken Hebrew' },
    ar: { type: 'string', description: 'Arabic translation / explanation of the reply' },
    correction: CORRECTION_JSON,
  },
  required: ['he', 'ar', 'correction'],
} as const;

// ---------- Role-play ----------

export const RoleplayRequest = z
  .object({
    activityId: z.string().min(1).max(100),
    level: Level,
    addressAs: AddressAs,
    /** Goal ids the student has already covered (the client keeps score). */
    met: z.array(z.string().max(100)).max(30),
    messages: z.array(ChatMessage).max(60),
  })
  .refine((r) => r.messages.length === 0 || r.messages.at(-1)?.role === 'student', {
    message: 'the last message must be from the student',
    path: ['messages'],
  });

/** What the model returns for one role-play turn; goal ids are limited to the open goals. */
export const roleplayModelReply = (openGoalIds: string[]) =>
  ModelReply.extend({
    goalsMet: z.array(openGoalIds.length ? z.enum(openGoalIds as [string, ...string[]]) : z.string()).describe(
      "Ids of open goals that the student's last message covered (in Hebrew)",
    ),
  });

export const roleplayJsonSchema = (openGoalIds: string[]) => ({
  type: 'object',
  properties: {
    ...REPLY_JSON_SCHEMA.properties,
    he: { type: 'string', description: 'Your next line, in character, in spoken Hebrew' },
    ar: { type: 'string', description: 'Arabic translation of your line (plus a short tip if helpful)' },
    goalsMet: {
      type: 'array',
      description: "Ids of open goals that the student's last message covered (in Hebrew)",
      items: openGoalIds.length ? { type: 'string', enum: openGoalIds } : { type: 'string' },
    },
  },
  required: ['he', 'ar', 'correction', 'goalsMet'],
});

export const RoleplayReply = ModelReply.extend({
  goalsMet: z.array(z.string()),
  finished: z.boolean(),
  level: Level,
  source: z.enum(['claude', 'gemini', 'mock', 'fallback']),
});

export type RoleplayRequest = z.infer<typeof RoleplayRequest>;
export type RoleplayReply = z.infer<typeof RoleplayReply>;
