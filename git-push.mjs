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

// Stage all changed source files (not dist or node_modules)
log.push('=== git status ===');
log.push(run('git status --short').out);

log.push('\n=== git add ===');
log.push(run('git add src/ index.html build-helper.mjs git-push.mjs .claude/launch.json').out || '(no output)');

log.push('\n=== git status after add ===');
log.push(run('git status --short').out);

log.push('\n=== git commit ===');
const commitResult = run('git commit -m "Phase 2/3: combat, weapon, kill feed, scoreboard, chat, ghost interpolation"');
log.push(commitResult.out);

log.push('\n=== git push ===');
const pushResult = run('git push origin main');
log.push(pushResult.out || '(no output — check stderr)');
if (!pushResult.ok) log.push('[PUSH FAILED] ' + pushResult.out);

const output = log.join('\n');
const s = createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(output);
});
s.listen(3006, () => console.log('[git-push] result at :3006\n\n' + output));
