/**
 * Live E2E test - Using Playwright MCP to discover real behavior
 */

import { test, expect, type Route } from '@playwright/test';

// Valid agent card matching the real schema
const VALID_AGENT_CARD = {
  protocolVersion: '1.0',
  name: 'Test Agent',
  description: 'A test agent for E2E testing',
  url: 'https://localhost:3001/api/agents/test',
  version: '1.0.0',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  skills: [],
};

test.describe('Live E2E Tests with Browser', () => {
  test('should load the app with proper mocks', async ({ page }) => {
    // Set up route mocks BEFORE navigation

    // Mock 1: Agent card endpoint
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      console.log('[MOCK] Agent card requested');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(VALID_AGENT_CARD),
      });
    });

    // Mock 2: Contexts/list JSON-RPC endpoint (for session listing)
    await page.route('**/api/agents/test', async (route: Route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      console.log('[MOCK] JSON-RPC request:', postData);

      // Handle contexts/list
      if (postData?.method === 'contexts/list') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            result: [], // Empty sessions list
          }),
        });
        return;
      }

      // Default: Continue with other requests
      await route.continue();
    });

    // Navigate to the app with agent card parameter
    const agentCardUrl = 'https://localhost:3001/api/agents/test/.well-known/agent-card.json';
    await page.goto(`https://localhost:3001/?agentCard=${encodeURIComponent(agentCardUrl)}`);

    // Wait for the app to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Take a screenshot to see what we got
    await page.screenshot({ path: 'e2e-results/01-app-loaded.png', fullPage: true });

    // Look for the chat interface elements
    const chatRoot = page.locator('#chat-root');
    await expect(chatRoot).toBeVisible({ timeout: 5000 });

    console.log('✅ App loaded successfully!');
  });

  test('should be able to send a message', async ({ page }) => {
    // Set up mocks
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(VALID_AGENT_CARD),
      });
    });

    await page.route('**/api/agents/test', async (route: Route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      // Handle contexts/list
      if (postData?.method === 'contexts/list') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: postData.id,
            result: [],
          }),
        });
        return;
      }

      // For now, let other requests through to see what they are
      console.log('[MOCK] Unknown JSON-RPC method:', postData?.method);
      await route.continue();
    });

    // Navigate
    const agentCardUrl = 'https://localhost:3001/api/agents/test/.well-known/agent-card.json';
    await page.goto(`https://localhost:3001/?agentCard=${encodeURIComponent(agentCardUrl)}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Find the message input - let's discover what the actual selector is
    await page.screenshot({ path: 'e2e-results/02-before-message.png', fullPage: true });

    // Try to find input field by different selectors
    const messageInput = page.locator('textarea, input[type="text"]').first();

    if (await messageInput.isVisible()) {
      console.log('✅ Found message input!');
      await messageInput.fill('Hello, test!');
      await page.screenshot({ path: 'e2e-results/03-message-typed.png', fullPage: true });

      // Find send button
      const sendButton = page
        .locator('button')
        .filter({ hasText: /send|submit|→/i })
        .first();

      if (await sendButton.isVisible()) {
        console.log('✅ Found send button!');
        await page.screenshot({ path: 'e2e-results/04-ready-to-send.png', fullPage: true });
        // Don't click yet - we need to mock the response first
      } else {
        console.log('❌ Send button not found');
      }
    } else {
      console.log('❌ Message input not found');
    }
  });
});
