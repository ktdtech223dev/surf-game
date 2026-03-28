import { execSync } from 'child_process';
import { createServer } from 'http';

function run(cmd) {
  try {
    return execSync(cmd, { cwd: 'E:\\SurfGame', encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    return null;
  }
}

// Open Railway new-project page pointing to the GitHub repo
const repoUrl = 'https://github.com/ktdtech223dev/surf-game';
console.log('[Railway] Opening Railway deploy page in browser...');
execSync(`start "" "https://railway.app/new/github"`, { shell: true });
console.log(`[Railway] When prompted, select this repo: ${repoUrl}`);
console.log('[Railway] Railway will auto-read railway.toml — no extra config needed');
console.log('[Railway] Build: npm install && npm run build');
console.log('[Railway] Start: npm start');

// Also try railway login in a new window so the user can auth in their terminal
console.log('\n[Railway] Also opening a Railway login terminal window...');
execSync(`start cmd /k "railway login && cd /d E:\\SurfGame && railway link && railway up"`, { shell: true });

const s = createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<html><body style="font:16px monospace;background:#111;color:#0f0;padding:20px">
    <h2 style="color:#00cfff">SURF GAME — Railway Deploy</h2>
    <p>GitHub repo: <a href="${repoUrl}" style="color:#0cf">${repoUrl}</a></p>
    <p>A Railway login window has opened in your terminal.</p>
    <p>After logging in, run: <code style="color:#ff0">railway link</code> then <code style="color:#ff0">railway up</code></p>
    <hr style="border-color:#333">
    <p style="color:#555">Or connect directly at railway.app → New Project → Deploy from GitHub → surf-game</p>
  </body></html>`);
});
s.listen(3001, () => console.log('\n[deploy-helper] Instructions at http://localhost:3001'));
