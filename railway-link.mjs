import { execSync } from 'child_process';
import { createServer } from 'http';

const DIR = 'E:\\SurfGame';
const log = [];

function run(cmd) {
  try {
    const out = execSync(cmd, { cwd: DIR, encoding: 'utf8', stdio: 'pipe', timeout: 30000 }).trim();
    return { ok: true, out: out || '(ok)' };
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + '\n' + (e.stderr || '') + '\n' + e.message };
  }
}

// List projects to find the surf-game one
log.push('--- railway whoami ---');
log.push(run('railway whoami').out);

log.push('--- railway list ---');
log.push(run('railway list').out);

// Check if there's a .railway config
log.push('--- check .railway dir ---');
log.push(run('dir %APPDATA%\\railway').out);

const output = log.join('\n');
const s = createServer((_, res) => { res.writeHead(200, {'content-type':'text/plain'}); res.end(output); });
s.listen(3015, () => console.log('[railway-link]\n\n' + output));
