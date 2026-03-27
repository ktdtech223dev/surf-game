import { execSync } from 'child_process';
import { createServer } from 'http';

let buildLog = 'Starting build...\n';

try {
  buildLog += execSync('npx vite build 2>&1', {
    cwd: 'E:\\SurfGame',
    encoding: 'utf8',
    timeout: 120000,
  });
  buildLog += '\n[BUILD SUCCESS]\n';
} catch (e) {
  buildLog += '\n[BUILD ERROR]\n' + (e.stdout || '') + (e.stderr || '') + e.message;
}

const s = createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(buildLog);
});
s.listen(3005, () => console.log('[build-helper] ready on :3005'));
