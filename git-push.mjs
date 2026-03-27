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
log.push(run('git add src/client/SoundManager.js src/client/SettingsManager.js src/client/main.js src/client/Renderer.js index.html git-push.mjs').out || '(none)');

log.push('\n=== git status ===');
log.push(run('git status --short').out);

log.push('\n=== git commit ===');
log.push(run('git commit -m "Phase 4: procedural audio, settings panel, name prompt, FOV control"').out);

log.push('\n=== git push origin master ===');
const push = run('git push origin master');
log.push(push.ok ? '[OK] pushed' : '[FAILED] ' + push.out);

const output = log.join('\n');
const s = createServer((_, res) => { res.writeHead(200); res.end(output); });
s.listen(3006, () => console.log('[git-push]\n\n' + output));
