import { execSync } from 'child_process';
import { createServer } from 'http';

const DIR = 'E:\\SurfGame';
const log = [];

function run(cmd) {
  try {
    const out = execSync(cmd, { cwd: DIR, encoding: 'utf8', stdio: 'pipe', timeout: 120000 }).trim();
    return { ok: true, out: out || '(ok)' };
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + '\n' + (e.stderr || '') + '\n' + e.message };
  }
}

log.push('--- railway up --detach ---');
const r = run('railway up --detach');
log.push(r.ok ? '[OK] ' + r.out : '[FAIL] ' + r.out);

const output = log.join('\n');
const s = createServer((_, res) => { res.writeHead(200, {'content-type':'text/plain'}); res.end(output); });
s.listen(3014, () => console.log('[railway-up]\n\n' + output));
