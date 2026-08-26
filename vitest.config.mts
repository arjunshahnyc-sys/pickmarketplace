import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    // Pure-logic tests only (landed cost core, ranking). No jsdom: component
    // testing would need @testing-library and is a separate decision.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    // Mirror tsconfig's "@/*" -> "./src/*" without the vite-tsconfig-paths dep.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
