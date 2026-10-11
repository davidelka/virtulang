// Terminal chat with the tutor: npm run chat [-- --level A1]
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import { Level, type TutorRequest } from './schema';
import { getProvider, modelName } from './provider';
import { tutorReply } from './tutor';

const levelArg = process.argv.indexOf('--level');
const level = Level.parse(levelArg > -1 ? process.argv[levelArg + 1] : 'A2');
const history: TutorRequest['messages'] = [];
const rl = createInterface({ input: stdin, output: stdout });

console.log(`Hebrew tutor (${getProvider()}${modelName() ? ` · ${modelName()}` : ''}, level ${level}). Type in Arabic or Hebrew; empty line to quit.\n`);
rl.setPrompt('you> ');
rl.prompt();
for await (const line of rl) {
  const text = line.trim();
  if (!text) break;
  history.push({ role: 'student', text });
  try {
    const reply = await tutorReply({ level, messages: history });
    history.push({ role: 'tutor', text: reply.he });
    console.log(`tutor> ${reply.he}\n       ${reply.ar}`);
    if (reply.correction) {
      const c = reply.correction;
      console.log(`  ✏️  ${c.said} → ${c.better}\n      ${c.noteAr}`);
    }
    console.log(`       [${reply.source}]\n`);
  } catch (err) {
    history.pop();
    console.error('error:', (err as Error).message, '\n');
  }
  rl.prompt();
}
rl.close();
