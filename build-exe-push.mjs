import { execSync } from 'child_process';
import { createServer } from 'http';
import { existsSync, readdirSync } from 'fs';

const CWD = 'E:\\SurfGame';
const log = [];

function run(label, cmd, opts = {}) {
  log.push(`\n=== ${label} ===`);
  try {
    const out = execSync(cmd, { cwd: CWD, encoding: 'utf8', stdio: 'pipe', timeout: 300000, ...opts });
    log.push(out.trim() || '(ok)');
    log.push(`[${label} SUCCESS]`);
    return true;
  } catch (e) {
    log.push((e.stdout || '') + (e.stderr || '') + e.message);
    log.push(`[${label} FAILED]`);
    return false;
  }
}

// 1. Vite build
if (!run('Vite build', 'npx vite build')) {
  finalize(); process.exit(1);
}

// 2. Electron-builder portable exe
if (!run('Electron build', 'npx electron-builder --win portable')) {
  log.push('Electron build failed — skipping git push');
  finalize(); process.exit(1);
}

// 3. Find the built exe
const releaseDir = CWD + '\\release';
let exeFile = null;
if (existsSync(releaseDir)) {
  const files = readdirSync(releaseDir).filter(f => f.endsWith('.exe'));
  exeFile = files[0] || null;
}
log.push(`\nBuilt exe: ${exeFile ? 'release/' + exeFile : '(not found)'}`);

// 4. Git commit + push everything
run('Git add', 'git add -A');
run('Git commit', 'git commit -m "CuunSurf v1.0.0: Electron exe, longer maps, N Games integration, radio, polish"');
run('Git push', 'git push origin master');

finalize();

function finalize() {
  const output = log.join('\n');
  const s = createServer((_, res) => { res.writeHead(200, {'Content-Type':'text/plain'}); res.end(output); });
  s.listen(3019, () => console.log('[build-exe-push]\n' + output));
}
