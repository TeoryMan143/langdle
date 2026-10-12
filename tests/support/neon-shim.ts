import { neonConfig } from '@neondatabase/serverless';
import { Pool, type PoolClient, type QueryResult } from 'pg';

/**
 * The production database client is `drizzle-orm/neon-http`, which speaks
 * Neon's HTTP protocol and cannot reach a plain Postgres container. Instead of
 * swapping the driver in the tests (which would hide driver specific behaviour
 * such as `NeonDbError`), this answers the driver's own HTTP calls in-process
 * with a real query against the connection string it was given.
 *
 * Wire format, as implemented by `@neondatabase/serverless`: the request is
 * `{ query, params }` (or `{ queries: [...] }` for a batch, run in one
 * transaction) and the response is the raw text rows plus the field metadata,
 * which the driver parses by type id; a failed query is a `400` carrying the
 * Postgres error fields.
 */

type NeonQuery = { query: string; params?: unknown[] };

const ERROR_FIELDS = [
  'severity',
  'code',
  'detail',
  'hint',
  'position',
  'internalPosition',
  'internalQuery',
  'where',
  'schema',
  'table',
  'column',
  'dataType',
  'constraint',
  'file',
  'line',
  'routine',
] as const;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const pools = new Map<string, Pool>();

// The driver parses the values itself from the field type ids, so Postgres
// must hand them over untouched.
const rawTypes = { getTypeParser: () => (value: string) => value };

/** Guards against ever running queries against a real, remote database. */
export function assertLocalDatabase(connectionString: string) {
  const { hostname } = new URL(connectionString);

  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(
      `Refusing to run tests against "${hostname}": only a local database is allowed`,
    );
  }
}

function getPool(connectionString: string) {
  assertLocalDatabase(connectionString);

  let pool = pools.get(connectionString);

  if (!pool) {
    pool = new Pool({ connectionString });
    pools.set(connectionString, pool);
  }

  return pool;
}

function toNeonResult(result: QueryResult) {
  return {
    command: result.command,
    rowCount: result.rowCount,
    rows: result.rows,
    rowAsArray: true,
    fields: result.fields.map(field => ({
      name: field.name,
      tableID: field.tableID,
      columnID: field.columnID,
      dataTypeID: field.dataTypeID,
      dataTypeSize: field.dataTypeSize,
      dataTypeModifier: field.dataTypeModifier,
      format: field.format,
    })),
  };
}

function run(client: Pool | PoolClient, { query, params }: NeonQuery) {
  return client.query({
    text: query,
    values: params ?? [],
    rowMode: 'array',
    types: rawTypes,
  });
}

function toErrorResponse(error: unknown) {
  if (!(error instanceof Error) || !('code' in error)) {
    throw error;
  }

  const fields = error as Error & Record<string, unknown>;
  const body: Record<string, unknown> = { message: error.message };

  for (const field of ERROR_FIELDS) {
    body[field] = fields[field];
  }

  return new Response(JSON.stringify(body), {
    status: 400,
    headers: { 'content-type': 'application/json' },
  });
}

async function runBatch(pool: Pool, queries: NeonQuery[]) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const results = [];

    for (const query of queries) {
      results.push(toNeonResult(await run(client, query)));
    }

    await client.query('COMMIT');
    return { results };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function neonFetch(_url: unknown, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const connectionString = headers.get('Neon-Connection-String');

  if (!connectionString) {
    throw new Error('The neon driver sent no connection string');
  }

  const pool = getPool(connectionString);
  const body = JSON.parse(String(init?.body));

  try {
    const payload = Array.isArray(body.queries)
      ? await runBatch(pool, body.queries)
      : toNeonResult(await run(pool, body));

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Routes every query of the neon driver to the local database. */
export function installNeonShim() {
  neonConfig.fetchFunction = neonFetch;
}

export async function closeNeonShim() {
  await Promise.all([...pools.values()].map(pool => pool.end()));
  pools.clear();
}
