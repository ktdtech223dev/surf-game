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
const files = [
  'src/client/Renderer.js',
  'src/client/ProceduralMapGen.js',
  'src/client/MapFactory.js',
  'src/client/main.js',
  'src/client/NetworkClient.js',
  'src/client/MainMenu.js',
  'src/server/server.js',
].join(' ');

log.push(run(`git add ${files}`).out || '(staged)');
const c = run('git commit -m "Feat: map stacking fix, solo/online mode, online lobby with vote-skip, proc_ map pipeline"');
log.push(c.out);
const p = run('git push origin master');
log.push(p.ok ? '[OK] pushed' : '[FAILED] ' + p.out);

const output = log.join('\n');
const s = createServer((_, res) => { res.writeHead(200); res.end(output); });
s.listen(3006, () => console.log('[git-push]\n\n' + output));
