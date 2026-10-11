# AI tutor server

A small HTTP service that will power the app's tutor-bot with Claude. It runs on its own for now;
the app is not connected to it yet.

- **Without an API key** it runs in **mock mode**, using the app's keyword bot (`src/lib/bot.ts`). No cost, works offline.
- **With an API key** it calls Claude: short, simple Hebrew at the student's level, an Arabic version, and gentle corrections.

## Run
```bash
cd ai-server
npm install
cp .env.example .env      # optional: add ANTHROPIC_API_KEY to use Claude
npm run dev               # http://localhost:8787
npm run chat              # talk to the tutor in the terminal (--level A1|A2|B1|B2)
npm test                  # mock mode only, no network
```

## API
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
- `correction`: `{ said, better, noteAr }` when the student's Hebrew had a mistake (Claude mode), otherwise `null`.
- `source`: `claude`, `mock`, or `fallback` (the model declined or returned something unusable).
- Errors come back as `{ "error": { "ar": "…", "he": "…" } }` with status 400 / 413 / 502 / 503.

CORS allows only `ALLOWED_ORIGIN` (default `http://localhost:5173`, the app's dev server).

## Notes
- Model: `CLAUDE_MODEL` (default `claude-opus-5-5`). Cheaper option: `claude-haiku-5-5`.
- Logs record token usage and latency only, never what students wrote.
- Before real students use Claude mode: consent from the school/parents, and no identifying details in messages.
