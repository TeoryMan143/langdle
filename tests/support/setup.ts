import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { afterAll, afterEach, beforeAll, beforeEach, inject, vi } from 'vitest';
import { getClient } from '@/core/database/redis/config';
import { sendEmail } from '@/core/lib/email';
import {
  assertLocalDatabase,
  closeNeonShim,
  installNeonShim,
} from './neon-shim';
import { resetRedis } from './redis';

/**
 * Per test file setup of the `api` project. It runs before the test file (and
 * so before any module that reads the environment on import) and replaces
 * every external dependency: the databases point at the throwaway containers,
 * the secrets are made up and the email provider is a mock. The real `.env` is
 * never loaded here — and if it was, every value it carries is overwritten.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

vi.mock('@/core/lib/email', () => ({ sendEmail: vi.fn() }));

process.env.DATABASE_URL = inject('postgresUrl');
process.env.REDIS_HOST = inject('redisHost');
process.env.REDIS_PORT = String(inject('redisPort'));
process.env.JWT_SECRET = randomBytes(64).toString('base64url');
process.env.CRON_SECRET = 'test-cron-secret';
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

for (const name of [
  'REDIS_USER',
  'REDIS_PASSWORD',
  'RESEND_API_KEY',
  'EMAIL_FROM',
]) {
  delete process.env[name];
}

assertLocalDatabase(process.env.DATABASE_URL);

if (!LOCAL_HOSTS.has(process.env.REDIS_HOST)) {
  throw new Error(
    `Refusing to run tests against redis at "${process.env.REDIS_HOST}"`,
  );
}

installNeonShim();

const postgres = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
});

beforeAll(async () => {
  await redis.connect();
});

beforeEach(async () => {
  const { rows } = await postgres.query<{ tablename: string }>(
    `select tablename from pg_tables where schemaname = 'public'`,
  );
  const tables = rows.map(({ tablename }) => `"${tablename}"`).join(', ');

  await postgres.query(`truncate ${tables} restart identity cascade`);
  await resetRedis(redis);

  vi.mocked(sendEmail).mockReset().mockResolvedValue(true);

  // Services log the failures they report (a duplicated nickname, a bad
  // token…), which is noise when a test provokes them on purpose. Run with
  // TEST_LOGS=1 to see them.
  if (!process.env.TEST_LOGS) {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await Promise.all([
    postgres.end(),
    redis.quit(),
    closeNeonShim(),
    getClient().then(client => client.quit()),
  ]);
});
