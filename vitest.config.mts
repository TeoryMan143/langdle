import { defineConfig } from 'vitest/config';

export default defineConfig({
  // the `@/*` alias of tsconfig.json
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/**/*.test.{ts,tsx}'],
          exclude: ['tests/**/*.api.test.{ts,tsx}'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
      {
        // Runs against throwaway Postgres and Redis containers (needs Docker).
        extends: true,
        test: {
          name: 'api',
          include: ['tests/**/*.api.test.{ts,tsx}'],
          globalSetup: ['./tests/support/global-setup.ts'],
          setupFiles: ['./tests/support/setup.ts'],
          // The files share the two containers and reset them between tests,
          // so they must run one after the other (one worker at a time, each
          // file still with its own module graph).
          pool: 'forks',
          maxWorkers: 1,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
