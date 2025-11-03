/**
 * Debug SSE Mock - Simple test to see what's happening
 */

import { test, expect } from '@playwright/test';

const AGENT_CARD = {
  protocolVersion: '1.0',
  name: 'Test Agent',
  description: 'Test',
  url: 'https://localhost:3001/api/agents/test',
  version: '1.0.0',
  capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: false },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  skills: [],
};

test('debug SSE response', async ({ page }) => {
  // Capture all console messages
  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    console.log(`[BROWSER ${msg.type().toUpperCase()}]`, text);
  });

  let messageStreamCalled = false;
  let messageStreamRequest: any = null;

  await page.route('**/api/agents/test/.well-known/agent-card.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(AGENT_CARD),
    });
  });

  await page.route('**/api/agents/test', async (route) => {
    const req = route.request();
    console.log(`\n[ROUTE] ${req.method()} to ${req.url()}`);

    if (req.method() !== 'POST') {
      await route.continue();
      return;
    }

    const postData = req.postDataJSON();
    console.log('[ROUTE] POST data method:', postData?.method);

    if (postData?.method === 'contexts/list') {
      console.log('[ROUTE] Returning empty contexts list');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ jsonrpc: '2.0', id: postData.id, result: [] }),
      });
      return;
    }

    if (postData?.method === 'message/stream') {
      messageStreamCalled = true;
      messageStreamRequest = postData;
      console.log('[ROUTE] message/stream called!');
      console.log(
        '[ROUTE] Message parts:',
        JSON.stringify(postData.params?.message?.parts, null, 2)
      );

      // Simple single-event response
      const response = {
        jsonrpc: '2.0',
        id: postData.id,
        result: {
          taskId: 'task-test-123',
          contextId: postData.params?.message?.contextId || 'ctx-test-123',
          state: 'completed',
          message: {
            role: 'assistant',
            parts: [{ kind: 'text', text: 'This is a test response from the mock!' }],
          },
        },
      };

      const sseBody = `data: ${JSON.stringify(response)}\n\n`;
      console.log('[ROUTE] SSE response body:', sseBody);

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: sseBody,
      });
      return;
    }

    console.log('[ROUTE] Unknown method, continuing:', postData?.method);
    await route.continue();
  });

  console.log('\n=== Navigating to app ===');
  await page.goto(
    `https://localhost:3001/?agentCard=${encodeURIComponent('https://localhost:3001/api/agents/test/.well-known/agent-card.json')}`
  );
  await page.waitForLoadState('networkidle');

  console.log('\n=== Clicking "Start a new chat" ===');
  await page.getByRole('button', { name: /start a new chat/i }).click();
  await page.waitForTimeout(1000);

  console.log('\n=== Filling message ===');
  const textarea = page.locator('textarea').first();
  await textarea.fill('Test message');
  await page.waitForTimeout(500);

  console.log('\n=== Clicking send ===');
  await page.screenshot({ path: 'e2e-results/debug-before-send.png' });
  const sendButton = page.locator('button:has(svg)').last();
  await sendButton.click();

  console.log('\n=== Waiting for response ===');
  await page.waitForTimeout(3000);

  console.log('\n=== Taking screenshot ===');
  await page.screenshot({ path: 'e2e-results/debug-after-send-wait.png' });

  console.log('\n=== Verification ===');
  console.log('messageStreamCalled:', messageStreamCalled);
  console.log('messageStreamRequest:', JSON.stringify(messageStreamRequest, null, 2));
  console.log('\nConsole messages:');
  console.log(consoleMessages.join('\n'));

  // Check if call was made
  expect(messageStreamCalled).toBe(true);

  // Try to find the response text
  const responseLocator = page.getByText(/test response from the mock/i);
  const isVisible = await responseLocator.isVisible().catch(() => false);
  console.log('\nResponse text visible:', isVisible);

  if (!isVisible) {
    console.log('\n❌ Response not visible on page');
    // Print page text content for debugging
    const bodyText = await page.locator('body').textContent();
    console.log('\nPage text content:', bodyText);
  }
});
