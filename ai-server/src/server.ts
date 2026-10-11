import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { getProvider, modelName, providerErrorStatus } from './provider';
import { TutorRequest } from './schema';
import { tutorReply } from './tutor';

const MAX_BODY = 20_000;

const ERRORS = {
  badRequest: { ar: 'طلب غير صالح.', he: 'בקשה לא תקינה.' },
  tooLarge: { ar: 'الرسالة طويلة جدًا.', he: 'ההודעה ארוכה מדי.' },
  busy: { ar: 'المعلّم مشغول الآن، جرّب بعد قليل.', he: 'המורה עסוק כרגע, נסו שוב בעוד רגע.' },
  failed: { ar: 'حدث خطأ، جرّب مرة أخرى.', he: 'משהו השתבש, נסו שוב.' },
  notFound: { ar: 'غير موجود.', he: 'לא נמצא.' },
};

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: object,
  ) {
    super(String(status));
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, { error: ERRORS.tooLarge });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, { error: ERRORS.badRequest });
  }
}

export function createTutorServer(allowedOrigin = process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173') {
  return createServer(async (req, res) => {
    if (req.headers.origin === allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Vary', 'Origin');
    }
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204).end();
        return;
      }
      if (req.method === 'GET' && req.url === '/health') {
        send(res, 200, { ok: true, mode: getProvider(), model: modelName() });
        return;
      }
      if (req.method === 'POST' && req.url === '/api/tutor') {
        const parsed = TutorRequest.safeParse(await readJson(req));
        if (!parsed.success) {
          send(res, 400, { error: ERRORS.badRequest, issues: parsed.error.issues.map((i) => i.message) });
          return;
        }
        send(res, 200, await tutorReply(parsed.data));
        return;
      }
      send(res, 404, { error: ERRORS.notFound });
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, err.body);
      const status = providerErrorStatus(err);
      if (status) {
        const apiStatus = (err as { status?: number }).status;
        console.error(JSON.stringify({ event: 'provider_error', provider: getProvider(), status: apiStatus, type: (err as Error).name }));
        return send(res, status, { error: status === 503 ? ERRORS.busy : ERRORS.failed });
      }
      console.error(err);
      send(res, 500, { error: ERRORS.failed });
    }
  });
}
