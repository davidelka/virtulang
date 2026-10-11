// A tiny test page served at GET / so the tutor can be tried in a browser. Not part of the app.
export const TEST_PAGE = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI Tutor test</title>
<style>
  :root { --bg:#fbf5e9; --ink:#3d405b; --teal:#2a9d8f; --muted:#7a7363; --line:#e8cf9c; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family: system-ui, 'Segoe UI', Tahoma, sans-serif; }
  main { max-width:560px; margin:0 auto; padding:16px; display:flex; flex-direction:column; min-height:100dvh; box-sizing:border-box; }
  h1 { font-size:1.2rem; margin:0; } .sub { color:var(--muted); font-size:.85rem; margin:4px 0 12px; }
  #log { flex:1; display:flex; flex-direction:column; gap:10px; padding-bottom:12px; }
  .msg { max-width:88%; padding:10px 12px; border-radius:14px; line-height:1.5; }
  .me { align-self:flex-end; background:var(--teal); color:#fff; }
  .bot { align-self:flex-start; background:#fff; box-shadow:0 1px 6px #0001; }
  .he { font-size:1.05rem; } .ar, .meta { color:var(--muted); font-size:.85rem; margin-top:4px; }
  .fix { margin-top:6px; padding:6px 8px; background:#fff6e0; border-radius:8px; font-size:.9rem; }
  .err { align-self:center; color:#c0392b; font-size:.9rem; }
  form { display:flex; gap:8px; position:sticky; bottom:0; background:var(--bg); padding:8px 0; }
  input, select, button { font:inherit; border:2px solid var(--line); border-radius:999px; padding:10px 12px; background:#fff; }
  input { flex:1; min-width:0; } button { background:var(--teal); color:#fff; border-color:var(--teal); cursor:pointer; }
  button:disabled { opacity:.5; }
</style>
</head>
<body>
<main>
  <h1>معلّم العبرية — صفحة تجربة · המורה לעברית — דף בדיקה</h1>
  <div class="sub" id="status">…</div>
  <div id="log"></div>
  <form id="f">
    <select id="level" aria-label="level"><option>A1</option><option selected>A2</option><option>B1</option><option>B2</option></select>
    <input id="q" autocomplete="off" placeholder="اكتب بالعربية أو بالعبرية · כתבו בערבית או בעברית">
    <button id="send">إرسال</button>
  </form>
</main>
<script>
  const log = document.getElementById('log'), q = document.getElementById('q'), send = document.getElementById('send');
  const history = [];
  const add = (cls, html) => { const d = document.createElement('div'); d.className = 'msg ' + cls; d.innerHTML = html; log.append(d); d.scrollIntoView({ block: 'end' }); return d; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  fetch('/health').then((r) => r.json()).then((h) => {
    document.getElementById('status').textContent = 'mode: ' + h.mode + (h.model ? ' · ' + h.model : ' (no API key → keyword replies)');
  });
  document.getElementById('f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = q.value.trim();
    if (!text) return;
    q.value = ''; send.disabled = true;
    history.push({ role: 'student', text });
    add('me', esc(text));
    const t0 = performance.now();
    try {
      const res = await fetch('/api/tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: document.getElementById('level').value, messages: history }) });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error ? r.error.ar + ' · ' + r.error.he : res.status);
      history.push({ role: 'tutor', text: r.he });
      const c = r.correction;
      add('bot', '<div class="he" lang="he" dir="rtl">' + esc(r.he) + '</div><div class="ar">' + esc(r.ar) + '</div>' +
        (c ? '<div class="fix">✏️ <span lang="he">' + esc(c.said) + ' → <b>' + esc(c.better) + '</b></span><br>' + esc(c.noteAr) + '</div>' : '') +
        '<div class="meta">' + r.source + ' · ' + ((performance.now() - t0) / 1000).toFixed(1) + 's</div>');
    } catch (err) {
      history.pop();
      const d = document.createElement('div'); d.className = 'err'; d.textContent = err.message; log.append(d);
    } finally { send.disabled = false; q.focus(); }
  });
</script>
</body>
</html>`;
