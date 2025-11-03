import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for A2A Chat E2E tests
 * Mission-critical configuration with multi-browser support
 */
export default defineConfig({
  testDir: './e2e/tests',

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporting
  reporter: process.env.CI
    ? [['html'], ['github'], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['html'], ['list']],

  // Test timeouts
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },

  use: {
    // Base URL for all tests (HTTPS because vite uses mkcert)
    baseURL: 'https://localhost:3001',

    // Ignore HTTPS certificate errors for localhost
    ignoreHTTPSErrors: true,

    // Collect traces on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Action timeout
    actionTimeout: 10 * 1000,

    // Navigation timeout
    navigationTimeout: 30 * 1000,
  },

  // Test output
  outputDir: 'test-results',

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
      },
    },

    // Accessibility-focused project
    {
      name: 'accessibility',
      testDir: './e2e/tests/accessibility',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Web server configuration - commented out to allow manual server start
  // Start the dev server manually with: pnpm --filter @a2achat/iframe-app dev
  // webServer: {
  //   command: 'pnpm --filter @a2achat/iframe-app dev',
  //   url: 'http://localhost:3001',
  //   reuseExistingServer: true,
  //   timeout: 120 * 1000,
  //   stdout: 'ignore',
  //   stderr: 'pipe',
  // },
});
