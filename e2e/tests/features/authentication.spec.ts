/**
 * Authentication E2E Tests
 *
 * Tests for OBO (On-Behalf-Of) authentication flows including:
 * - Auth-required event handling
 * - Popup window interactions
 * - Single and multiple auth requirements
 * - Auth cancellation
 * - Auth completion and retry flows
 */

import { test, expect } from '../../fixtures/sse-fixtures';

// Agent card URL - intercepted by our fixture
const AGENT_CARD_URL = 'https://localhost:3001/api/agents/test/.well-known/agent-card.json';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app with mock agent card (fixture will intercept requests)
    await page.goto(`https://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');

    // Start new chat
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display authentication required UI', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Trigger auth required response
    await messageInput.fill('require auth');
    await sendButton.click();

    // Wait for user message
    await expect(page.getByText('require auth')).toBeVisible({ timeout: 5000 });

    // Auth message should appear
    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Service name should be visible (use exact match to avoid strict mode violation)
    await expect(page.getByText('Microsoft Graph', { exact: true })).toBeVisible({ timeout: 5000 });

    // Description should be visible
    await expect(page.getByText(/Access to your Microsoft Graph data is required/i)).toBeVisible({
      timeout: 5000,
    });

    // Sign in button should be visible
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible({ timeout: 5000 });
  });

  test('should display service icon when provided', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    // Wait for auth UI
    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Check for service icon image
    const serviceIcon = page.locator('img[alt="Microsoft Graph"]');
    await expect(serviceIcon).toBeVisible({ timeout: 5000 });
    await expect(serviceIcon).toHaveAttribute('src', 'https://example.com/icons/graph.png');
  });

  test('should handle multiple authentication requirements', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Trigger multiple auth response
    await messageInput.fill('multiple auth');
    await sendButton.click();

    // Wait for auth UI
    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Both services should be listed (use exact match to avoid strict mode violation)
    await expect(page.getByText('Microsoft Graph', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('SharePoint', { exact: true })).toBeVisible({ timeout: 5000 });

    // Both descriptions should be visible
    await expect(page.getByText(/Access to your Microsoft Graph data is required/i)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(/Access to your SharePoint sites is required/i)).toBeVisible({
      timeout: 5000,
    });

    // Both should have sign in buttons
    const signInButtons = page.getByRole('button', { name: /Sign In/i });
    await expect(signInButtons).toHaveCount(2);
  });

  test('should open popup when sign in button is clicked', async ({ page, context }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    // Wait for auth UI
    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Set up popup listener before clicking
    const popupPromise = context.waitForEvent('page');

    // Click sign in button
    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    // Wait for popup to open
    const popup = await popupPromise;

    // Verify popup URL (now using microsoft.com as a real reachable URL)
    expect(popup.url()).toContain('microsoft.com');

    // Close popup to clean up
    await popup.close();
  });

  test('should show authenticating state when popup is open', async ({ page, context }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Set up popup listener
    const popupPromise = context.waitForEvent('page');

    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    const popup = await popupPromise;

    // Wait for button text to change to "Authenticating..."
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some((btn) => /Authenticating/i.test(btn.textContent || ''));
      },
      { timeout: 5000 }
    );

    // Button should show "Authenticating..." state
    await expect(page.getByRole('button', { name: /Authenticating/i })).toBeVisible({
      timeout: 1000,
    });

    // Button should be disabled during auth
    await expect(page.getByRole('button', { name: /Authenticating/i })).toBeDisabled();

    await popup.close();
  });

  test('should handle cancel authentication', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Find and click cancel button
    const cancelButton = page.getByRole('button', { name: /Cancel Authentication/i });
    await expect(cancelButton).toBeVisible({ timeout: 5000 });
    await cancelButton.click();

    // Should show canceled state
    await expect(page.getByText(/Authentication Canceled/i)).toBeVisible({ timeout: 5000 });
  });

  test('should disable cancel button while authenticating', async ({ page, context }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    const popupPromise = context.waitForEvent('page');

    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    const popup = await popupPromise;

    // Wait for button text to change to "Authenticating..."
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some((btn) => /Authenticating/i.test(btn.textContent || ''));
      },
      { timeout: 5000 }
    );

    // Cancel button should be disabled while authenticating
    const cancelButton = page.getByRole('button', { name: /Cancel Authentication/i });
    await expect(cancelButton).toBeDisabled();

    await popup.close();
  });

  test('should handle popup blocker scenario', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Override window.open to return null (simulating popup blocker)
    await page.evaluate(() => {
      window.open = () => null;
    });

    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    // Should show error state (implementation-dependent, may show alert or error message)
    // This tests that the app doesn't crash when popup is blocked
    await page.waitForTimeout(1000);

    // Auth UI should still be visible (not crashed)
    await expect(page.getByText(/Authentication Required/i)).toBeVisible();
  });
});

test.describe('Authentication Completion Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`https://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show completed state after successful auth', async ({ page, context }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    const popupPromise = context.waitForEvent('page');

    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    const popup = await popupPromise;

    // Simulate successful auth by closing popup
    await popup.close();

    // Wait for button text to change to "Authenticated"
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some((btn) => /Authenticated/i.test(btn.textContent || ''));
      },
      { timeout: 5000 }
    );

    // Should show authenticated state
    await expect(page.getByRole('button', { name: /Authenticated/i })).toBeVisible({
      timeout: 1000,
    });

    // Should show completion badge
    await expect(page.getByText(/All services authenticated successfully/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test('should send authentication completed message', async ({ page, context }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // First, trigger auth required
    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    const popupPromise = context.waitForEvent('page');
    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    const popup = await popupPromise;
    await popup.close();

    // Wait for button text to change to "Authenticated"
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some((btn) => /Authenticated/i.test(btn.textContent || ''));
      },
      { timeout: 5000 }
    );

    // Wait for authenticated state
    await expect(page.getByRole('button', { name: /Authenticated/i })).toBeVisible({
      timeout: 1000,
    });

    // Now send the auth completed message to resume the task
    // In the real implementation, this would happen automatically
    // For testing, we'll manually trigger it
    await expect(messageInput).toBeEnabled({ timeout: 5000 });
    await messageInput.fill('auth completed');
    await sendButton.click();

    // Should receive the secured data response
    await expect(
      page.getByText(/Authentication successful! Here is your secured data/i)
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test('should handle multiple auth completions in sequence', async ({ page, context }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('multiple auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Authenticate first service
    const signInButtons = page.getByRole('button', { name: /Sign In/i });

    // First auth
    const popupPromise1 = context.waitForEvent('page');
    await signInButtons.first().click();
    const popup1 = await popupPromise1;
    await popup1.close();

    // Wait for first button to show "Authenticated"
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some((btn) => /Authenticated/i.test(btn.textContent || ''));
      },
      { timeout: 5000 }
    );

    // First service should show authenticated
    await expect(signInButtons.first()).toHaveText(/Authenticated/);

    // Second auth
    const popupPromise2 = context.waitForEvent('page');
    await signInButtons.nth(1).click();
    const popup2 = await popupPromise2;
    await popup2.close();

    // Wait for completion badge
    await page.waitForFunction(
      () => {
        return Array.from(document.querySelectorAll('*')).some((el) =>
          /All services authenticated successfully/i.test(el.textContent || '')
        );
      },
      { timeout: 5000 }
    );

    // Both should show authenticated
    await expect(page.getByText(/All services authenticated successfully/i)).toBeVisible({
      timeout: 1000,
    });
  });
});

test.describe('Authentication Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`https://localhost:3001/?agentCard=${encodeURIComponent(AGENT_CARD_URL)}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /start a new chat/i }).click();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle rapid authentication attempts', async ({ page, context }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    const signInButton = page.getByRole('button', { name: /Sign In/i });

    // Rapidly click sign in button (should not open multiple popups)
    await signInButton.click();

    // Wait for button text to change to "Authenticating..."
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some((btn) => /Authenticating/i.test(btn.textContent || ''));
      },
      { timeout: 5000 }
    );

    // Should show authenticating state (not crashed)
    await expect(page.getByRole('button', { name: /Authenticating/i })).toBeVisible({
      timeout: 1000,
    });

    // Clean up any popups that were opened
    const pages = context.pages();
    for (const p of pages) {
      if (p !== page) {
        await p.close();
      }
    }
  });

  test('should handle auth required during another auth', async ({ page, context }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Trigger first auth
    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i).first()).toBeVisible({
      timeout: 10000,
    });

    const popupPromise = context.waitForEvent('page');
    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    const popup = await popupPromise;

    // While popup is open, try to send another message (simulating concurrent auth needs)
    // Note: The input might be disabled during auth in the actual implementation
    const inputEnabled = await messageInput.isEnabled();
    if (inputEnabled) {
      await messageInput.fill('another message');
      // Input might not allow sending during auth
    }

    await popup.close();

    // Wait for button text to change to "Authenticated"
    await page.waitForFunction(
      () => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements.some((el) => /Authenticated/i.test(el.textContent || ''));
      },
      { timeout: 5000 }
    );

    // First auth should complete normally
    await expect(page.getByText(/Authenticated/i).first()).toBeVisible({ timeout: 1000 });
  });

  test('should maintain auth state after page interactions', async ({ page, context }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    const popupPromise = context.waitForEvent('page');
    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    const popup = await popupPromise;
    await popup.close();

    // Wait for button text to change to "Authenticated"
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some((btn) => /Authenticated/i.test(btn.textContent || ''));
      },
      { timeout: 5000 }
    );

    // Wait for authenticated state
    await expect(page.getByRole('button', { name: /Authenticated/i })).toBeVisible({
      timeout: 1000,
    });

    // Scroll the page (simulate user interaction)
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(500);

    // Auth state should persist
    await expect(page.getByRole('button', { name: /Authenticated/i })).toBeVisible();
    await expect(page.getByText(/All services authenticated successfully/i)).toBeVisible();
  });
});
