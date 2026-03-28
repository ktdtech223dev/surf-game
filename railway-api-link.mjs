/**
 * Uses Railway GraphQL API to find the Surf Game project ID,
 * then writes a railway.json so 'railway up' works without interactive link.
 */
import { execSync } from 'child_process';
import { createServer } from 'http';
import { readFileSync, writeFileSync } from 'fs';
import https from 'https';

const TOKEN = JSON.parse(
  readFileSync('C:\\Users\\kesha\\.railway\\config.json', 'utf8')
).user.accessToken;

const log = [];
log.push('Token found: ' + TOKEN.slice(0,12) + '...');

const query = `{
  me {
    workspaces {
      id name
      projects {
        edges {
          node {
            id name
            environments { edges { node { id name } } }
            services { edges { node { id name } } }
          }
        }
      }
    }
  }
}`;

function gql(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: body });
    const req = https.request({
      hostname: 'backboard.railway.app',
      path: '/graphql/v2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      let out = '';
      res.on('data', c => out += c);
      res.on('end', () => resolve(JSON.parse(out)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const res = await gql(query);
    log.push('RAW: ' + JSON.stringify(res).slice(0, 3000));
    if (res.errors) { log.push('GraphQL errors: ' + JSON.stringify(res.errors)); }
    const workspaces = res.data?.me?.workspaces ?? [];
    const projects = workspaces.flatMap(w => w.projects?.edges ?? []);
    log.push(`Found ${workspaces.length} workspaces, ${projects.length} projects:`);

    let surfProject = null;
    for (const { node } of projects) {
      log.push(`  ${node.id}  "${node.name}"`);
      if (node.name.toLowerCase().includes('surf')) surfProject = node;
    }

    if (!surfProject) {
      log.push('[FAIL] Could not find Surf Game project');
    } else {
      log.push('\n[FOUND] ' + surfProject.name);
      const envEdges = surfProject.environments?.edges ?? [];
      const svcEdges = surfProject.services?.edges ?? [];
      log.push('Environments: ' + envEdges.map(e => e.node.name + '=' + e.node.id).join(', '));
      log.push('Services: ' + svcEdges.map(s => s.node.name + '=' + s.node.id).join(', '));

      // Find production environment
      const prodEnv = envEdges.find(e => e.node.name.toLowerCase().includes('production'))
                   ?? envEdges[0];
      const svc = svcEdges[0];

      if (prodEnv) {
        // Write to ~/.railway/config.json so CLI recognizes the linked project
        const configPath = 'C:\\Users\\kesha\\.railway\\config.json';
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        // Railway CLI uses the directory path as the key
        config.projects = config.projects ?? {};
        config.projects['E:\\SurfGame'] = {
          projectId:     surfProject.id,
          environmentId: prodEnv.node.id,
          serviceId:     svc?.node.id,
        };
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        log.push('\n[WROTE] ~/.railway/config.json with project link');
        log.push(JSON.stringify(config.projects['E:\\SurfGame'], null, 2));

        // Now try railway up
        log.push('\n--- railway up --detach ---');
        try {
          const out = execSync('railway up --detach', {
            cwd: 'E:\\SurfGame',
            encoding: 'utf8',
            stdio: 'pipe',
            timeout: 120000,
          }).trim();
          log.push('[OK] ' + out);
        } catch (e) {
          log.push('[FAIL] ' + (e.stdout||'') + (e.stderr||'') + e.message);
        }
      } else {
        log.push('[FAIL] No environment found');
      }
    }
  } catch (e) {
    log.push('[ERROR] ' + e.message);
  }

  const output = log.join('\n');
  const s = createServer((_, res) => { res.writeHead(200, {'content-type':'text/plain'}); res.end(output); });
  s.listen(3017, () => console.log('[railway-api-link]\n\n' + output));
})();
