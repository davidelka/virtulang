// Mock mode only (AI_MOCK=1 via `npm test`): no network, no cost.
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import { roleplayReply } from '../src/roleplay';
import { RoleplayReply, RoleplayRequest, roleplayJsonSchema } from '../src/schema';
import { createTutorServer } from '../src/server';

type Msg = { role: 'student' | 'tutor'; text: string };

async function play(level: 'A1' | 'A2' | 'B1' | 'B2', answers: string[]) {
  const messages: Msg[] = [];
  const met: string[] = [];
  let r = await roleplayReply({ activityId: 'intro-roleplay', level, met, messages });
  const replies = [r];
  for (const a of answers) {
    messages.push({ role: 'tutor', text: r.he }, { role: 'student', text: a });
    r = await roleplayReply({ activityId: 'intro-roleplay', level, met, messages });
    met.push(...r.goalsMet);
    replies.push(r);
    if (r.finished) break;
  }
  return { replies, met, last: r };
}

describe('introduction role-play (mock)', () => {
  test('opens with a greeting and a question, no goals yet', async () => {
    const r = await roleplayReply({ activityId: 'intro-roleplay', level: 'A1', met: [], messages: [] });
    RoleplayReply.parse(r);
    assert.match(r.he, /רונית/);
    assert.match(r.he, /\?/);
    assert.deepEqual(r.goalsMet, []);
    assert.equal(r.finished, false);
  });

  test('A1 has 4 goals and finishes after 4 answers', async () => {
    const { met, last, replies } = await play('A1', ['סלמה', 'שש עשרה', 'ברהט', 'כיתה י', 'extra']);
    assert.deepEqual(met, ['name', 'age', 'town', 'school']);
    assert.equal(last.finished, true);
    assert.equal(replies.length, 5);
    assert.equal(last.level, 'A1');
  });

  test('A2 adds family and hobbies', async () => {
    const { met } = await play('A2', ['a', 'b', 'c', 'd', 'e', 'f']);
    assert.deepEqual(met, ['name', 'age', 'town', 'family', 'hobby']);
  });

  test('B2 uses the closest lower level (B1)', async () => {
    const r = await roleplayReply({ activityId: 'intro-roleplay', level: 'B2', met: [], messages: [] });
    assert.equal(r.level, 'B1');
  });

  test('goals already met are skipped', async () => {
    const r = await roleplayReply({
      activityId: 'intro-roleplay',
      level: 'A1',
      met: ['name', 'age', 'town'],
      messages: [{ role: 'student', text: 'כיתה י' }],
    });
    assert.deepEqual(r.goalsMet, ['school']);
    assert.equal(r.finished, true);
  });

  test('unknown or non-roleplay activity is rejected', async () => {
    await assert.rejects(roleplayReply({ activityId: 'bus-ticket', level: 'A1', met: [], messages: [] }));
    await assert.rejects(roleplayReply({ activityId: 'nope', level: 'A1', met: [], messages: [] }));
  });

  test('request validation', () => {
    const ok = { activityId: 'intro-roleplay', level: 'A1', met: [], messages: [] };
    assert.ok(RoleplayRequest.safeParse(ok).success);
    assert.ok(RoleplayRequest.safeParse({ ...ok, addressAs: 'female' }).success);
    assert.ok(!RoleplayRequest.safeParse({ ...ok, addressAs: 'other' }).success);
    assert.ok(!RoleplayRequest.safeParse({ ...ok, messages: [{ role: 'tutor', text: 'x' }] }).success);
    assert.ok(!RoleplayRequest.safeParse({ ...ok, activityId: '' }).success);
  });

  test('Gemini schema limits goal ids to the open ones', () => {
    const s = roleplayJsonSchema(['age', 'town']);
    assert.deepEqual(s.properties.goalsMet.items, { type: 'string', enum: ['age', 'town'] });
    assert.deepEqual([...s.required].sort(), ['ar', 'correction', 'goalsMet', 'he']);
  });
});

describe('POST /api/roleplay', () => {
  const server = createTutorServer();
  let base = '';
  before(async () => {
    await new Promise<void>((r) => server.listen(0, r));
    base = `http://localhost:${(server.address() as AddressInfo).port}`;
  });
  after(() => server.close());
  const post = (body: unknown) =>
    fetch(`${base}/api/roleplay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  test('returns a turn', async () => {
    const res = await post({ activityId: 'intro-roleplay', level: 'A2', met: [], messages: [] });
    assert.equal(res.status, 200);
    RoleplayReply.parse(await res.json());
  });
  test('unknown activity → 404', async () => {
    assert.equal((await post({ activityId: 'nope', level: 'A2', met: [], messages: [] })).status, 404);
  });
  test('bad request → 400', async () => {
    assert.equal((await post({ level: 'A2' })).status, 400);
  });
});
