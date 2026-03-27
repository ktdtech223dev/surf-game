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

log.push('=== git add ===');
log.push(run('git add src/ index.html git-push.mjs').out || '(none)');

log.push('\n=== git status ===');
log.push(run('git status --short').out);

log.push('\n=== git commit ===');
const commit = run('git commit -m "Phase 5: Section 3 ramp, checkpoints, death overlay, finish banner, leaderboard, ghost color"');
log.push(commit.out);

log.push('\n=== git push ===');
const push = run('git push origin master');
log.push(push.ok ? '[OK] pushed to master' : '[FAILED]\n' + push.out);

const output = log.join('\n');
const s = createServer((_, res) => { res.writeHead(200); res.end(output); });
s.listen(3006, () => console.log('[git-push]\n\n' + output));
