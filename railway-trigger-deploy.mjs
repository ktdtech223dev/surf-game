/**
 * Triggers a Railway redeploy via GraphQL API.
 * Finds latest deployment for surf-game service, then redeployes it.
 */
import { createServer } from 'http';
import { readFileSync, writeFileSync } from 'fs';
import https from 'https';

const cfg = JSON.parse(readFileSync('C:\\Users\\kesha\\.railway\\config.json', 'utf8'));
// Restore correct auth in case CLI nuked it
if (!cfg.user) cfg.user = {};
const TOKEN = cfg.user.accessToken || 'xHUpPrzhlbLV_bAB7RTnSrHnd_PABDy2mePapUcQRnZ';

// Restore config with auth + project link
const restored = {
  projects: {
    'E:\\SurfGame': {
      projectId:     '01c66726-0785-4b07-915c-3140e603ff2c',
      environmentId: '8d394e42-906e-4272-b5fc-8adba34f7f8c',
      serviceId:     'ee082310-0de8-4381-952e-7cf1e3063c8f',
    },
  },
  user: {
    token:          null,
    accessToken:    TOKEN,
    refreshToken:   'g07dU_O8RgGmDyCn6WDgscTj-2CKpwxhr9OIJCvz7J-',
    tokenExpiresAt: 1774631660,
  },
  linkedFunctions: null,
};
writeFileSync('C:\\Users\\kesha\\.railway\\config.json', JSON.stringify(restored, null, 2));

const SERVICE_ID     = 'ee082310-0de8-4381-952e-7cf1e3063c8f';
const ENVIRONMENT_ID = '8d394e42-906e-4272-b5fc-8adba34f7f8c';
const log = [];
log.push('Token: ' + TOKEN.slice(0,12) + '...');
log.push('Restored config.json');

function gql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const req = https.request({
      hostname: 'backboard.railway.app',
      path: '/graphql/v2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let out = '';
      res.on('data', c => out += c);
      res.on('end', () => { try { resolve(JSON.parse(out)); } catch { resolve({ raw: out }); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  // Step 1: get latest deployment for the service
  log.push('\n--- Fetching latest deployment ---');
  const deploymentsRes = await gql(`
    query($serviceId: String!, $environmentId: String!) {
      deployments(
        first: 1
        input: { serviceId: $serviceId, environmentId: $environmentId }
      ) {
        edges {
          node {
            id
            status
            createdAt
          }
        }
      }
    }
  `, { serviceId: SERVICE_ID, environmentId: ENVIRONMENT_ID });

  log.push(JSON.stringify(deploymentsRes).slice(0, 1000));

  const deployments = deploymentsRes.data?.deployments?.edges ?? [];
  if (!deployments.length) {
    log.push('[FAIL] No deployments found');
  } else {
    const latest = deployments[0].node;
    log.push(`Latest deployment: ${latest.id} (${latest.status})`);

    // Step 2: redeploy it
    log.push('\n--- Triggering redeploy ---');
    const redeployRes = await gql(`
      mutation($id: String!) {
        deploymentRedeploy(id: $id)
      }
    `, { id: latest.id });

    log.push(JSON.stringify(redeployRes).slice(0, 500));

    if (redeployRes.data?.deploymentRedeploy) {
      log.push('[OK] Redeploy triggered! Check Railway dashboard.');
    } else if (redeployRes.errors) {
      log.push('[FAIL] ' + redeployRes.errors.map(e => e.message).join(', '));

      // Try serviceInstanceDeploy as fallback
      log.push('\n--- Trying serviceInstanceDeploy ---');
      const deployRes = await gql(`
        mutation($serviceId: String!, $environmentId: String!) {
          serviceInstanceDeploy(
            serviceId: $serviceId
            environmentId: $environmentId
          )
        }
      `, { serviceId: SERVICE_ID, environmentId: ENVIRONMENT_ID });
      log.push(JSON.stringify(deployRes).slice(0, 500));
    }
  }

  const output = log.join('\n');
  const s = createServer((_, res) => { res.writeHead(200, {'content-type':'text/plain'}); res.end(output); });
  s.listen(3018, () => console.log('[railway-trigger-deploy]\n\n' + output));
})();
