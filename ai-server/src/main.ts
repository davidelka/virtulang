import { MODEL } from './claude';
import { createTutorServer } from './server';
import { getMode } from './tutor';

const port = Number(process.env.PORT ?? 8787);
createTutorServer().listen(port, () => {
  const mode = getMode();
  console.log(`AI tutor on http://localhost:${port} — mode: ${mode}${mode === 'claude' ? ` (${MODEL})` : ' (no API key → keyword replies)'}`);
});
