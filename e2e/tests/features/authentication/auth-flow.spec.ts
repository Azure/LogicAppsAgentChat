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

import { test, expect } from '../../../fixtures/sse-fixtures';

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

  test.skip('should open popup when sign in button is clicked', async ({ page, context }) => {
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

  test.skip('should show authenticating state when popup is open', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    // Wait for authentication to complete (mocked popup closes automatically)
    // The button should transition from "Sign In" -> "Authenticating..." -> "Authenticated"
    const authenticatedButton = page.getByRole('button', { name: /^Authenticated$/i });
    await expect(authenticatedButton).toBeVisible({ timeout: 5000 });
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

  test.skip('should disable cancel button while authenticating', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Cancel button should be enabled before auth starts
    const cancelButton = page.getByRole('button', { name: /Cancel Authentication/i });
    await expect(cancelButton).toBeEnabled({ timeout: 2000 });

    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    // Wait for authentication to complete (mocked popup closes automatically)
    const authenticatedButton = page.getByRole('button', { name: /^Authenticated$/i });
    await expect(authenticatedButton).toBeVisible({ timeout: 5000 });

    // After auth completes, cancel button should not be visible
    await expect(cancelButton).not.toBeVisible({ timeout: 5000 });
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

  test.skip('should show completed state after successful auth', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    // Wait for authentication to complete (mocked popup closes automatically)
    const authenticatedButton = page.getByRole('button', { name: /^Authenticated$/i });
    await expect(authenticatedButton).toBeVisible({ timeout: 5000 });

    // Should show completion badge
    await expect(page.getByText(/All services authenticated successfully/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test.skip('should send authentication completed message', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // First, trigger auth required
    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    // Wait for authenticated state (mocked popup closes automatically)
    const authenticatedButton = page.getByRole('button', { name: /^Authenticated$/i });
    await expect(authenticatedButton).toBeVisible({ timeout: 5000 });

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

  test.skip('should handle multiple auth completions in sequence', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('multiple auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    // Authenticate first service
    const signInButtons = page.getByRole('button', { name: /Sign In/i });

    // First auth (mocked popup closes automatically)
    await signInButtons.first().click();

    // Wait for first button to show "Authenticated"
    await expect(signInButtons.first()).toHaveText(/Authenticated/, { timeout: 5000 });

    // Second auth (mocked popup closes automatically)
    await signInButtons.nth(1).click();

    // Both should show authenticated and completion message
    await expect(page.getByText(/All services authenticated successfully/i)).toBeVisible({
      timeout: 5000,
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

  test.skip('should handle rapid authentication attempts', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    const signInButton = page.getByRole('button', { name: /Sign In/i });

    // Click sign in button
    await signInButton.click();

    // Wait for authentication to complete (mocked popup closes automatically)
    const authenticatedButton = page.getByRole('button', { name: /^Authenticated$/i });
    await expect(authenticatedButton).toBeVisible({ timeout: 5000 });
  });

  test.skip('should handle auth required during another auth', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    // Trigger first auth
    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i).first()).toBeVisible({
      timeout: 10000,
    });

    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    // While auth is processing, try to send another message (simulating concurrent auth needs)
    // Note: The input might be disabled during auth in the actual implementation
    const inputEnabled = await messageInput.isEnabled();
    if (inputEnabled) {
      await messageInput.fill('another message');
      // Input might not allow sending during auth
    }

    // First auth should complete normally (mocked popup closes automatically)
    const authenticatedButton = page.getByRole('button', { name: /^Authenticated$/i });
    await expect(authenticatedButton).toBeVisible({ timeout: 5000 });
  });

  test.skip('should maintain auth state after page interactions', async ({ page }) => {
    const messageInput = page.locator('textarea').first();
    const sendButton = page.locator('button:has(svg)').last();

    await messageInput.fill('require auth');
    await sendButton.click();

    await expect(page.getByText(/Authentication Required/i)).toBeVisible({ timeout: 10000 });

    const signInButton = page.getByRole('button', { name: /Sign In/i });
    await signInButton.click();

    // Wait for authenticated state (mocked popup closes automatically)
    const authenticatedButton = page.getByRole('button', { name: /^Authenticated$/i });
    await expect(authenticatedButton).toBeVisible({ timeout: 5000 });

    // Scroll the page (simulate user interaction)
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(500);

    // Auth state should persist
    await expect(authenticatedButton).toBeVisible();
    await expect(page.getByText(/All services authenticated successfully/i)).toBeVisible();
  });
});
