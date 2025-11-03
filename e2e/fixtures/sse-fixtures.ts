/**
 * Playwright Fixtures for SSE Mocking
 *
 * Sets up route interception for A2A SSE endpoints using Playwright's built-in capabilities
 */

import { test as base, Page } from '@playwright/test';
import { generateSSEResponse, AGENT_CARD } from '../mocks/sse-generators';

async function setupSSEMocking(page: Page) {
  // Intercept agent card requests
  await page.route('**/api/agents/test/.well-known/agent-card.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(AGENT_CARD),
    });
  });

  // Intercept POST requests to the agent endpoint
  await page.route('**/api/agents/test', async (route) => {
    const request = route.request();

    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }

    const postData = request.postDataJSON();
    const { method, id, params } = postData;

    // Handle contexts/list
    if (method === 'contexts/list') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id,
          result: [],
        }),
      });
      return;
    }

    // Handle message/stream with SSE
    if (method === 'message/stream') {
      const userMessage = params?.message?.parts?.[0]?.text || '';
      console.log('[SSE FIXTURE] Generating SSE response for message:', userMessage);
      const sseContent = generateSSEResponse(id, userMessage);

      // Log the first 500 chars of the response
      console.log('[SSE FIXTURE] SSE response (first 500 chars):', sseContent.substring(0, 500));

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: sseContent,
      });
      return;
    }

    // Unknown method
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unknown method' }),
    });
  });
}

// Create a custom test that automatically sets up SSE mocking
export const test = base.extend<{ mockSSE: void }>({
  mockSSE: [
    async ({ page }, use) => {
      await setupSSEMocking(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
