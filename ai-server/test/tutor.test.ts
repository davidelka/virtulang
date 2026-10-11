// Mock mode only (AI_MOCK=1 via `npm test`): no network, no cost.
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import { TutorRequest, TutorReply } from '../src/schema';
import { createTutorServer } from '../src/server';
import { REPLY_JSON_SCHEMA } from '../src/schema';
import { getProvider, scriptsLookRight } from '../src/provider';
import { START_SIGNAL, trimHistory, tutorReply } from '../src/tutor';

const ask = (text: string) => tutorReply({ level: 'A2', messages: [{ role: 'student', text }] });

describe('mock tutor', () => {
  test('runs in mock mode', () => assert.equal(getProvider(), 'mock'));

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

describe('provider selection', () => {
  const KEYS = ['AI_MOCK', 'AI_PROVIDER', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY'] as const;
  const withEnv = (env: Partial<Record<(typeof KEYS)[number], string>>, fn: () => void) => {
    const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
    for (const k of KEYS) delete process.env[k];
    Object.assign(process.env, env);
    try {
      fn();
    } finally {
      for (const k of KEYS) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    }
  };

  test('no keys → mock', () => withEnv({}, () => assert.equal(getProvider(), 'mock')));
  test('only a Gemini key → gemini', () => withEnv({ GEMINI_API_KEY: 'g' }, () => assert.equal(getProvider(), 'gemini')));
  test('only a Claude key → claude', () => withEnv({ ANTHROPIC_API_KEY: 'a' }, () => assert.equal(getProvider(), 'claude')));
  test('AI_PROVIDER picks between two keys', () =>
    withEnv({ ANTHROPIC_API_KEY: 'a', GEMINI_API_KEY: 'g', AI_PROVIDER: 'gemini' }, () =>
      assert.equal(getProvider(), 'gemini'),
    ));
  test('AI_PROVIDER without its key → mock', () =>
    withEnv({ ANTHROPIC_API_KEY: 'a', AI_PROVIDER: 'gemini' }, () => assert.equal(getProvider(), 'mock')));
  test('AI_MOCK=1 wins', () => withEnv({ GEMINI_API_KEY: 'g', AI_MOCK: '1' }, () => assert.equal(getProvider(), 'mock')));
});

describe('Gemini output schema', () => {
  test('requires the same fields as ModelReply and allows a null correction', () => {
    assert.deepEqual([...REPLY_JSON_SCHEMA.required].sort(), ['ar', 'correction', 'he']);
    assert.deepEqual(REPLY_JSON_SCHEMA.properties.correction.type, ['object', 'null']);
  });
});

describe('tutor starts the conversation', () => {
  test('empty history → greeting with a question', async () => {
    const r = await tutorReply({ level: 'A2', messages: [] });
    assert.equal(r.source, 'mock');
    assert.match(r.he, /\?/);
  });

  test('history opening with the tutor keeps its question, behind the start signal', () => {
    const t = trimHistory([
      { role: 'tutor', text: 'מה אכלת היום?' },
      { role: 'student', text: 'אכלתי פיתה' },
    ]);
    assert.equal(t[0].text, START_SIGNAL);
    assert.equal(t[1].text, 'מה אכלת היום?');
  });
});

describe('garbled output check', () => {
  const r = (he: string, ar: string) => ({ he, ar, correction: null });
  test('normal reply passes', () => assert.ok(scriptsLookRight(r('שלום! מה שלומך?', 'مرحبًا! كيف حالك؟'))));
  test('Arabic quoting a Hebrew word passes', () => assert.ok(scriptsLookRight(r('אומרים: לחם', '«خبز» بالعبرية: «לחם»'))));
  test('Arabic written in Hebrew letters fails', () =>
    assert.ok(!scriptsLookRight(r('שלום! מה שלומך?', 'אחלא וסחלא! קיפ חאלכ אליום?'))));
  test('Hebrew field in Arabic fails', () => assert.ok(!scriptsLookRight(r('مرحبا كيف حالك', 'مرحبًا! كيف حالك؟'))));
});

describe('request validation', () => {
  const valid = { level: 'A1', messages: [{ role: 'student', text: 'שלום' }] };

  test('accepts a valid request', () => assert.ok(TutorRequest.safeParse(valid).success));
  test('accepts empty history (tutor starts)', () => assert.ok(TutorRequest.safeParse({ ...valid, messages: [] }).success));
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
    assert.ok(trimmed.length <= 21); // 20 + the start signal when a tutor turn ends up first
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
    assert.equal((await post({ level: 'A2', messages: [{ role: 'tutor', text: 'היי' }] })).status, 400);
  });

  test('body over 20 KB → 413', async () => {
    assert.equal((await post({ level: 'A2', pad: 'x'.repeat(25_000), messages: [] })).status, 413);
  });

  test('GET / serves the test page', async () => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/html/);
    assert.match(await res.text(), /\/api\/tutor/);
  });

  test('unknown route → 404', async () => {
    assert.equal((await fetch(`${base}/nope`)).status, 404);
  });
});

describe('addressing', async () => {
  const { levelNote } = await import('../src/prompt');
  test('the chosen form reaches the model; unknown means plural', () => {
    assert.match(levelNote('A2', 'female'), /feminine/);
    assert.match(levelNote('A2', 'male'), /masculine/);
    assert.match(levelNote('A2'), /plural/);
  });
});

describe('correction clean-up', async () => {
  const { dropNoopCorrection } = await import('../src/provider');
  test('drops a correction that changes nothing', () => {
    const r = { he: 'x', ar: 'y', correction: { said: 'אני בן שש עשרה', better: 'אני בן שש עשרה.', noteAr: 'صحيح' } };
    assert.equal(dropNoopCorrection(r).correction, null);
  });
  test('keeps a real correction', () => {
    const r = { he: 'x', ar: 'y', correction: { said: 'אני גרים ברהט', better: 'אני גר ברהט', noteAr: '…' } };
    assert.ok(dropNoopCorrection(r).correction);
  });
});
