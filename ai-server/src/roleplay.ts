import { getActivity } from '../../src/lib/content';
import { goalsFor, scriptedTurn } from '../../src/lib/roleplay';
import type { RoleplayContent } from '../../src/types';
import { ROLEPLAY_PROMPT, addressNote } from './prompt';
import { generateChecked, getProvider } from './provider';
import {
  roleplayJsonSchema,
  roleplayModelReply,
  type RoleplayReply,
  type RoleplayRequest,
} from './schema';

export class UnknownActivityError extends Error {}

/** After this many student turns per goal, the scene ends even if goals are still open. */
const TURNS_PER_GOAL = 3;

/**
 * One role-play turn. The scenario is read from the app's content (src/content/activities.json),
 * never from the request, so clients can't inject instructions.
 */
export async function roleplayReply(req: RoleplayRequest): Promise<RoleplayReply> {
  const activity = getActivity(req.activityId);
  if (!activity || activity.template !== 'roleplay') throw new UnknownActivityError(req.activityId);
  const content = activity.content as RoleplayContent;
  const { level, goals } = goalsFor(content, req.level);

  const met = req.met.filter((id) => goals.some((g) => g.id === id));
  const open = goals.filter((g) => !met.includes(g.id));
  const lastStudent = req.messages.length ? req.messages[req.messages.length - 1].text : null;
  const studentTurns = req.messages.filter((m) => m.role === 'student').length;
  const tooLong = studentTurns >= goals.length * TURNS_PER_GOAL;

  const scripted = (source: 'mock' | 'fallback'): RoleplayReply => ({
    ...scriptedTurn(content, goals, met, lastStudent),
    correction: null,
    level,
    source,
  });

  const provider = getProvider();
  if (provider === 'mock') return scripted('mock');

  const setup = [
    '[Role-play setup]',
    `Your character: ${content.character.roleHe}. Your name: ${content.character.nameHe}.`,
    `Student level: ${level}.`,
    addressNote(req.addressAs),
    'Goals (id: topic):',
    ...goals.map((g) => `- ${g.id}: ${g.labelHe} / ${g.labelAr}`),
  ].join('\n');
  const genderNote = addressNote(req.addressAs);
  const openNote = open.length
    ? `[Open goals: ${open.map((g) => g.id).join(', ')}. ${genderNote}]`
    : `[No open goals: close the conversation warmly. ${genderNote}]`;
  const start = '[Start: greet the student in character, introduce yourself in one short sentence, and ask about one goal.]';

  // The setup sits at the very start so the prefix stays identical across turns.
  const history = req.messages.map((m) => ({
    role: m.role === 'student' ? ('user' as const) : ('assistant' as const),
    text: m.text,
  }));
  const turns =
    history[0]?.role === 'user'
      ? [{ ...history[0], text: `${setup}\n\n${history[0].text}` }, ...history.slice(1)]
      : [{ role: 'user' as const, text: `${setup}\n\n${start}` }, ...history];
  const last = turns[turns.length - 1];
  if (lastStudent !== null) last.text = `${last.text}\n\n${openNote}`;

  const ids = open.map((g) => g.id);
  const reply = await generateChecked(provider, {
    label: 'roleplay',
    system: ROLEPLAY_PROMPT,
    turns,
    schema: roleplayModelReply(ids),
    jsonSchema: roleplayJsonSchema(ids),
  });
  if (!reply) return scripted('fallback');

  const goalsMet = lastStudent === null ? [] : reply.goalsMet.filter((id) => ids.includes(id));
  const left = ids.filter((id) => !goalsMet.includes(id));
  const finished = left.length === 0 || tooLong;
  // Ended by the turn limit while the model was still asking: close with the scenario's goodbye.
  const closing = finished && left.length > 0 ? { he: content.closingHe, ar: content.closingAr } : {};
  return { he: reply.he, ar: reply.ar, ...closing, correction: reply.correction, goalsMet, finished, level, source: provider };
}
