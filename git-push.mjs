import { execSync } from 'child_process';
import { createServer } from 'http';

function run(cmd) {
  try {
    return { ok: true, out: execSync(cmd, { cwd: 'E:\\SurfGame', encoding: 'utf8', stdio: 'pipe' }).trim() };
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + (e.stderr || '') + e.message };
  }
}

const log = [];
log.push(run('git add src/ index.html git-push.mjs').out || '(staged)');
log.push(run('git status --short').out);
const c = run('git commit -m "Phase 6: weapon sounds, reconnect, section indicator, server rate-limit + position validation"');
log.push(c.out);
const p = run('git push origin master');
log.push(p.ok ? '[OK] pushed' : '[FAILED] ' + p.out);

const output = log.join('\n');
const s = createServer((_, res) => { res.writeHead(200); res.end(output); });
s.listen(3006, () => console.log('[git-push]\n\n' + output));
