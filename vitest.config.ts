import tsPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsPaths()],
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
          // so they must run one after the other (isolated module graphs,
          // one process).
          pool: 'forks',
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
