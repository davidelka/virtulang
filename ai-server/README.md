# AI tutor server

A small HTTP service that will power the app's tutor-bot with AI (Gemini or Claude). It runs on its own for now;
the app is not connected to it yet.

- **Without an API key** it runs in **mock mode**, using the app's keyword bot (`src/lib/bot.ts`). No cost, works offline.
- **With a Gemini or Claude key** it calls that model: short, simple Hebrew at the student's level, an Arabic version, and gentle corrections. Both use the same instructions (`src/prompt.ts`) and the same reply format.

## Choosing the provider
| Set in `.env` | Uses |
|---|---|
| nothing | mock |
| `GEMINI_API_KEY` only | Gemini (`GEMINI_MODEL`, default `gemini-3.5-flash-lite`) |
| `ANTHROPIC_API_KEY` only | Claude (`CLAUDE_MODEL`, default `claude-opus-5-5`) |
| both keys | Claude, unless `AI_PROVIDER=gemini` |
| `AI_MOCK=1` | mock, whatever else is set |

If the main Gemini model is overloaded or slow (2 tries of up to 10 s each — Gemini's minimum deadline), one attempt is made with `GEMINI_BACKUP_MODEL` (default `gemini-3.1-flash-lite`), so a reply comes within ~33 s; the app waits 40 s.

Gemini key: https://aistudio.google.com/apikey · `npm run models` lists the Gemini models your key can use.

## Run
```bash
cd ai-server
npm install
cp .env.example .env      # optional: add GEMINI_API_KEY or ANTHROPIC_API_KEY
npm run dev               # http://localhost:8787 — open it in a browser for a test chat page
npm run chat              # talk to the tutor in the terminal (--level A1|A2|B1|B2)
npm run models            # Gemini models available to your key
npm test                  # mock mode only, no network
```

## API
`GET /` → a simple test chat page (for trying the tutor in a browser; not used by the app)

`GET /health` → `{ ok, mode: "mock" | "claude", model }`

`POST /api/tutor`
```json
{ "level": "A2", "messages": [{ "role": "student", "text": "איך אומרים خبز?" }] }
```
→
```json
{ "he": "אומרים: לחם", "ar": "…", "correction": null, "source": "mock" }
```
- `messages`: the conversation so far (`student` / `tutor`), last one from the student, each up to 500 characters. Only the last 20 are used.
- `correction`: `{ said, better, noteAr }` when the student's Hebrew had a mistake (AI modes), otherwise `null`.
- `source`: `gemini`, `claude`, `mock`, or `fallback` (the model declined or returned something unusable).
- Errors come back as `{ "error": { "ar": "…", "he": "…" } }` with status 400 / 413 / 502 / 503.

CORS allows only `ALLOWED_ORIGIN` (default `http://localhost:5173`, the app's dev server).

## Notes
- Gemini default is the fast `gemini-3.5-flash-lite` (~1 s replies, good for spoken chat). `gemini-3.8-flash` is stronger but slower, and its free tier allowed only 20 requests a day when tested. Free-tier limits per model are shown in Google AI Studio.
- Cheaper Claude: `CLAUDE_MODEL=claude-haiku-5-5`.
- **Gemini free tier:** check Google's current terms on how free-tier data is used before sending real students' messages; use the paid tier for that.
- Logs record token usage and latency only, never what students wrote.
- Before real students use an AI mode: consent from the school/parents, and no identifying details in messages.
