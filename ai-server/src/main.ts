import { getProvider, modelName } from './provider';
import { createTutorServer } from './server';

const port = Number(process.env.PORT ?? 8787);
createTutorServer().listen(port, () => {
  const mode = getProvider();
  console.log(`AI tutor on http://localhost:${port} — mode: ${mode} (${modelName() ?? 'no API key → keyword replies'})`);
});
