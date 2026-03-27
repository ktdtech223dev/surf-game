import { execSync } from 'child_process';
import { createServer } from 'http';
import { readdirSync, readFileSync, existsSync } from 'fs';

const log = [];

// Try various locations Railway might store config/token
const locs = [
  'C:\\Users\\kesha\\AppData\\Roaming\\railway',
  'C:\\Users\\kesha\\AppData\\Local\\railway',
  'C:\\Users\\kesha\\.railway',
  'E:\\SurfGame\\railway.json',
  'E:\\SurfGame\\.railway',
];

for (const loc of locs) {
  if (existsSync(loc)) {
    log.push(`[FOUND] ${loc}`);
    try {
      const files = readdirSync(loc);
      log.push('  Files: ' + files.join(', '));
      for (const f of files) {
        try {
          log.push(`  ${f}: ` + readFileSync(loc + '\\' + f, 'utf8').slice(0, 400));
        } catch {}
      }
    } catch {
      // might be a file not a dir
      try { log.push('  Content: ' + readFileSync(loc, 'utf8').slice(0, 400)); } catch {}
    }
  } else {
    log.push(`[NOT FOUND] ${loc}`);
  }
}

// Also try Railway API to get project ID
log.push('\n--- railway status (from E:\\SurfGame) ---');
try {
  const out = execSync('railway status', { cwd: 'E:\\SurfGame', encoding: 'utf8', stdio: 'pipe', timeout: 15000 }).trim();
  log.push(out);
} catch (e) { log.push((e.stdout||'') + (e.stderr||'')); }

// Try listing service IDs
log.push('\n--- railway variables (from E:\\SurfGame) ---');
try {
  const out = execSync('railway variables', { cwd: 'E:\\SurfGame', encoding: 'utf8', stdio: 'pipe', timeout: 15000 }).trim();
  log.push(out.slice(0, 1000));
} catch (e) { log.push((e.stdout||'') + (e.stderr||'')); }

const output = log.join('\n');
const s = createServer((_, res) => { res.writeHead(200, {'content-type':'text/plain'}); res.end(output); });
s.listen(3016, () => console.log('[railway-find-config]\n\n' + output));
