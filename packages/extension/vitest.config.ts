import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Resolve .js imports to .ts for vitest (same as webpack extensionAlias)
    },
    extensions: ['.ts', '.js'],
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/__mocks__/chrome.ts'],
    include: ['src/**/*.test.ts'],
  },
});
