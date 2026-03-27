import { execSync } from 'child_process';
import { createServer } from 'http';

const log = [];
try {
  const out = execSync('npm install', { cwd: 'E:\\SurfGame', encoding: 'utf8', stdio: 'pipe' });
  log.push('[OK] npm install\n' + out);
} catch (e) {
  log.push('[PARTIAL/FAILED]\n' + (e.stdout || '') + (e.stderr || '') + e.message);
}

const output = log.join('\n');
const s = createServer((_, res) => { res.writeHead(200); res.end(output); });
s.listen(3007, () => console.log('[npm-install]\n\n' + output));
