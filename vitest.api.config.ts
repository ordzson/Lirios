import { defineConfig } from 'vitest/config';

// API handler tests run in plain Node: they call `handler.fetch(new Request(...))`
// directly, so no dev server is needed. Component tests stay on `ng test`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['api/**/*.test.ts', 'server/**/*.test.ts'],
    passWithNoTests: true,
  },
});
