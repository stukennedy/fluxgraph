import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  esbuild: {
    target: 'node18',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
