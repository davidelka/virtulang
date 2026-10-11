// npm run models — lists the Gemini models your GEMINI_API_KEY can use.
import { listGeminiModels } from './gemini';

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set (put it in ai-server/.env).');
  process.exit(1);
}
const names = await listGeminiModels();
console.log(names.filter((n) => n.startsWith('gemini')).join('\n'));
