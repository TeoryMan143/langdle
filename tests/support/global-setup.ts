import path from 'node:path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { GenericContainer, Wait } from 'testcontainers';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    postgresUrl: string;
    redisHost: string;
    redisPort: number;
  }
}

// Same major as production; Redis Stack bundles RedisJSON and RediSearch, the
// two modules the language catalogue depends on.
const POSTGRES_IMAGE = 'postgres:17-alpine';
const REDIS_IMAGE = 'redis/redis-stack-server:7.4.0-v3';

/**
 * Boots a throwaway Postgres and Redis for the whole `api` test run and applies
 * the real drizzle migrations to the empty database, so a migration that drifts
 * from `tables.ts` fails the suite. Nothing here ever reads `.env`: the
 * containers are the only databases the tests can reach.
 */
export default async function setup(project: TestProject) {
  const [postgres, redis] = await Promise.all([
    new PostgreSqlContainer(POSTGRES_IMAGE).start(),
    new GenericContainer(REDIS_IMAGE)
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .start(),
  ]);

  const stop = () => Promise.all([postgres.stop(), redis.stop()]);
  const postgresUrl = postgres.getConnectionUri();
  const pool = new Pool({ connectionString: postgresUrl });

  try {
    await migrate(drizzle(pool), {
      migrationsFolder: path.resolve(process.cwd(), 'drizzle'),
    });
  } catch (error) {
    // close the pool first: a connection dropped by the stopping container
    // would otherwise surface as an uncaught error and hide this one
    await pool.end();
    await stop();
    throw error;
  }

  await pool.end();

  project.provide('postgresUrl', postgresUrl);
  project.provide('redisHost', redis.getHost());
  project.provide('redisPort', redis.getMappedPort(6379));

  return async () => {
    await stop();
  };
}
