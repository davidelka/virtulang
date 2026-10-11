// Mock mode only (AI_MOCK=1 via `npm test`): no network, no cost.
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import { TutorRequest, TutorReply } from '../src/schema';
import { createTutorServer } from '../src/server';
import { getMode, trimHistory, tutorReply } from '../src/tutor';

const ask = (text: string) => tutorReply({ level: 'A2', messages: [{ role: 'student', text }] });

describe('mock tutor', () => {
  test('runs in mock mode', () => assert.equal(getMode(), 'mock'));

  test('how do I say (Arabic word) → Hebrew', async () => {
    const r = await ask('كيف أقول خبز؟');
    assert.equal(r.source, 'mock');
    assert.match(r.he, /לחם/);
    assert.equal(r.correction, null);
    TutorReply.parse(r); // matches the contract
  });

  test('translate (Hebrew word) → Arabic', async () => {
    assert.match((await ask('ترجمة: תודה')).ar, /شكرًا/);
  });

  test('greeting', async () => {
    assert.match((await ask('שלום')).he, /שלום/);
  });

  test('unknown input → fallback hint', async () => {
    assert.match((await ask('blah blah')).he, /איך אומרים/);
  });
});

describe('request validation', () => {
  const valid = { level: 'A1', messages: [{ role: 'student', text: 'שלום' }] };

  test('accepts a valid request', () => assert.ok(TutorRequest.safeParse(valid).success));
  test('rejects empty history', () => assert.ok(!TutorRequest.safeParse({ ...valid, messages: [] }).success));
  test('rejects last message from tutor', () =>
    assert.ok(
      !TutorRequest.safeParse({ ...valid, messages: [...valid.messages, { role: 'tutor', text: 'היי' }] }).success,
    ));
  test('rejects text over 500 chars', () =>
    assert.ok(!TutorRequest.safeParse({ ...valid, messages: [{ role: 'student', text: 'א'.repeat(501) }] }).success));
  test('rejects unknown level', () => assert.ok(!TutorRequest.safeParse({ ...valid, level: 'C2' }).success));
});

describe('history trimming', () => {
  test('keeps the last 20 and starts with the student', () => {
    const long = Array.from({ length: 31 }, (_, i) => ({
      role: (i % 2 === 0 ? 'student' : 'tutor') as 'student' | 'tutor',
      text: `m${i}`,
    }));
    const trimmed = trimHistory(long);
    assert.ok(trimmed.length <= 20);
    assert.equal(trimmed[0].role, 'student');
    assert.equal(trimmed.at(-1)!.text, 'm30');
  });
});

describe('HTTP server', () => {
  const server = createTutorServer('http://localhost:5173');
  let base = '';
  before(async () => {
    await new Promise<void>((r) => server.listen(0, r));
    base = `http://localhost:${(server.address() as AddressInfo).port}`;
  });
  after(() => server.close());

  const post = (body: unknown, origin = 'http://localhost:5173') =>
    fetch(`${base}/api/tutor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  test('GET /health', async () => {
    const res = await fetch(`${base}/health`);
    assert.deepEqual(await res.json(), { ok: true, mode: 'mock', model: null });
  });

  test('POST /api/tutor returns a reply and CORS for the app origin', async () => {
    const res = await post({ level: 'A2', messages: [{ role: 'student', text: 'איך אומרים خبز?' }] });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    const body = TutorReply.parse(await res.json());
    assert.match(body.he, /לחם/);
  });

  test('no CORS header for other origins', async () => {
    const res = await post({ level: 'A2', messages: [{ role: 'student', text: 'שלום' }] }, 'https://evil.example');
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });

  test('bad JSON → 400 with bilingual message', async () => {
    const res = await post('{nope');
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: { ar: string; he: string } };
    assert.ok(body.error.ar && body.error.he);
  });

  test('invalid request → 400', async () => {
    assert.equal((await post({ level: 'A2', messages: [] })).status, 400);
  });

  test('body over 20 KB → 413', async () => {
    assert.equal((await post({ level: 'A2', pad: 'x'.repeat(25_000), messages: [] })).status, 413);
  });

  test('unknown route → 404', async () => {
    assert.equal((await fetch(`${base}/nope`)).status, 404);
  });
});
