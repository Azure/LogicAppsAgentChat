/**
 * Debug Authentication SSE - Test to see what's happening with auth
 */

import { test, expect } from '../../fixtures/sse-fixtures';

const AGENT_CARD_URL = 'https://localhost:3001/api/agents/test/.well-known/agent-card.json';

test('debug auth response', async ({ page }) => {
  // Capture all console messages
  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    console.log(`[BROWSER ${msg.type().toUpperCase()}]`, text);
  });

  console.log('\n=== Navigating to app ===');
  await page.goto(`https://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
  await page.waitForLoadState('networkidle');

  console.log('\n=== Clicking "Start a new chat" ===');
  await page.getByRole('button', { name: /start a new chat/i }).click();
  await page.waitForTimeout(1000);

  console.log('\n=== Filling auth message ===');
  const textarea = page.locator('textarea').first();
  await textarea.fill('require auth');
  await page.waitForTimeout(500);

  console.log('\n=== Clicking send ===');
  await page.screenshot({ path: 'test-results/auth-debug-before-send.png' });
  const sendButton = page.locator('button:has(svg)').last();
  await sendButton.click();

  console.log('\n=== Waiting for response ===');
  await page.waitForTimeout(5000);

  console.log('\n=== Taking screenshot ===');
  await page.screenshot({ path: 'test-results/auth-debug-after-send.png' });

  console.log('\n=== Checking page content ===');
  const bodyText = await page.locator('body').textContent();
  console.log('\nPage text content:', bodyText);

  console.log('\nConsole messages:');
  console.log(consoleMessages.join('\n'));

  // Check if auth UI appeared
  const authUIVisible = await page
    .getByText(/Authentication Required/i)
    .isVisible()
    .catch(() => false);
  console.log('\nAuth UI visible:', authUIVisible);

  // Print all text on page
  const allText = await page.evaluate(() => document.body.innerText);
  console.log('\nAll text on page:\n', allText);
});
