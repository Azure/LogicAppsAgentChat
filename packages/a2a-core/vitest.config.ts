import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', '**/examples/**', '**/*.spec.ts'],
    setupFiles: ['./src/react/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.config.ts', '**/index.ts'],
      thresholds: {
        lines: 70,
        functions: 95,
        branches: 70,
        statements: 70,
      },
    },
  },
});
