/**
 * Multi-Session Chat Flow E2E Tests
 *
 * Based on real browser behavior discovered via Playwright MCP:
 * - App shows a multi-session UI with sidebar
 * - User must click "Start a new chat" to begin
 * - Then chat interface with message input appears
 */

import { test, expect, type Route } from '@playwright/test';

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

test.describe('Multi-Session Chat Flow', () => {
  test('should show empty state when no sessions exist', async ({ page }) => {
    // Setup mocks
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

      // Handle contexts/list - return empty list initially
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

      // Let other requests through for now
      await route.continue();
    });

    // Navigate to app
    const agentCardUrl = 'https://localhost:3001/api/agents/test/.well-known/agent-card.json';
    await page.goto(`https://localhost:3001/?agentCard=${encodeURIComponent(agentCardUrl)}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verify empty state
    await expect(page.getByText('No chats yet')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /start a new chat/i })).toBeVisible();
  });

  test('should open chat interface when clicking "Start a new chat"', async ({ page }) => {
    // Setup mocks
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

      await route.continue();
    });

    // Navigate
    const agentCardUrl = 'https://localhost:3001/api/agents/test/.well-known/agent-card.json';
    await page.goto(`https://localhost:3001/?agentCard=${encodeURIComponent(agentCardUrl)}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Click "Start a new chat"
    const startChatButton = page.getByRole('button', { name: /start a new chat/i });
    await startChatButton.click();

    // Take screenshot to see what happens
    await page.screenshot({ path: 'e2e-results/03-after-new-chat.png', fullPage: true });

    // Now there should be a message input
    const messageInput = page.locator('textarea').first();
    await expect(messageInput).toBeVisible({ timeout: 5000 });

    // Should have send button (SVG icon button)
    const sendButton = page.locator('button:has(svg)').last();
    await expect(sendButton).toBeVisible();
  });

  test('should send a message and show typing indicator', async ({ page }) => {
    // Setup mocks
    await page.route('**/api/agents/test/.well-known/agent-card.json', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(VALID_AGENT_CARD),
      });
    });

    let chatRequestReceived = false;

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

      // Handle message/stream
      if (postData?.method === 'message/stream') {
        chatRequestReceived = true;

        // Return SSE stream with a simple response
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: {"jsonrpc":"2.0","id":"1","result":{"taskId":"task-1","contextId":"ctx-1","state":"working","message":{"role":"assistant","parts":[{"kind":"text","text":""}]}}}\n\n`,
        });
        return;
      }

      await route.continue();
    });

    // Navigate
    const agentCardUrl = 'https://localhost:3001/api/agents/test/.well-known/agent-card.json';
    await page.goto(`https://localhost:3001/?agentCard=${encodeURIComponent(agentCardUrl)}`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Start new chat
    await page.getByRole('button', { name: /start a new chat/i }).click();

    // Wait for chat interface
    const messageInput = page.locator('textarea').first();
    await expect(messageInput).toBeVisible({ timeout: 5000 });

    // Type and send message
    await messageInput.fill('Hello, test agent!');

    const sendButton = page.locator('button:has(svg)').last();
    await sendButton.click();

    // Verify user message appears
    await expect(page.getByText('Hello, test agent!')).toBeVisible({ timeout: 5000 });

    // Verify typing indicator shows
    await expect(page.getByText(/agent is typing/i)).toBeVisible({ timeout: 5000 });

    // Verify chat request was made
    expect(chatRequestReceived).toBe(true);
  });
});
