import { z } from 'zod';

// The contract between the app and the AI tutor.

export const MAX_HISTORY = 20;
export const MAX_TEXT = 500;

export const Level = z.enum(['A1', 'A2', 'B1', 'B2']);

export const ChatMessage = z.object({
  role: z.enum(['student', 'tutor']),
  text: z.string().trim().min(1).max(MAX_TEXT),
});

export const TutorRequest = z
  .object({
    level: Level,
    // Longer histories are accepted and trimmed to the last MAX_HISTORY messages.
    messages: z.array(ChatMessage).min(1).max(100),
  })
  .refine((r) => r.messages.at(-1)?.role === 'student', {
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
  source: z.enum(['claude', 'mock', 'fallback']),
});

export type TutorRequest = z.infer<typeof TutorRequest>;
export type ModelReply = z.infer<typeof ModelReply>;
export type TutorReply = z.infer<typeof TutorReply>;
