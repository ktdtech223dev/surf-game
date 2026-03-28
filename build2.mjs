import { execSync } from 'child_process';
import { createServer } from 'http';

let log = 'Building...\n';
try {
  log += execSync('npx vite build', { cwd: 'E:\\SurfGame', encoding: 'utf8', stdio: 'pipe', timeout: 120000 });
  log += '\n[BUILD SUCCESS]';
} catch (e) {
  log += '\n[BUILD FAILED]\n' + (e.stdout||'') + (e.stderr||'') + e.message;
}

const s = createServer((_, res) => { res.writeHead(200); res.end(log); });
s.listen(3009, () => console.log('[build2]\n' + log));
