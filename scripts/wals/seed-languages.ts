/**
 * Stores the languages of `languages.json` in the catalogue (Redis `lang:<id>`
 * documents, the shape `setLanguageData` writes), every one of them inactive.
 *
 * A language is only written when none of its codes is taken (`ca` and `cat`
 * are the same Catalan), with `NX`, so a run never overwrites a language and
 * can be repeated safely. `--remove` undoes a seed: it deletes only the
 * documents still identical to the dataset, so a language someone has edited
 * or activated since is kept.
 *
 *   node --env-file=.env scripts/wals/seed-languages.ts --dry-run
 *   node --env-file=.env scripts/wals/seed-languages.ts [--min-known=20] [--only=arz,ary]
 *   node --env-file=.env scripts/wals/seed-languages.ts --remove [--dry-run]
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from 'redis';

type LanguageDocument = {
  name: string;
  exonym?: string;
  features: string[];
  partial: string[];
  active: false;
  searchParams: string[];
};

type Entry = {
  id: string;
  codes: string[];
  data: LanguageDocument;
  meta: { known: number };
};

const args = process.argv.slice(2);
const option = (name: string) =>
  args.find(arg => arg.startsWith(`--${name}=`))?.split('=')[1];

const DRY_RUN = args.includes('--dry-run');
const REMOVE = args.includes('--remove');
const ONLY = option('only')?.split(',');
const MIN_KNOWN = Number(option('min-known') ?? 0);
const BATCH = 50;

const { languages } = JSON.parse(
  readFileSync(join(import.meta.dirname, 'languages.json'), 'utf8'),
) as { languages: Entry[] };

const selected = languages.filter(
  entry => (!ONLY || ONLY.includes(entry.id)) && entry.meta.known >= MIN_KNOWN,
);

const { REDIS_USER, REDIS_PASSWORD, REDIS_HOST, REDIS_PORT } = process.env;

if (!REDIS_HOST || !REDIS_PORT) {
  console.error('REDIS_HOST and REDIS_PORT are required (--env-file=.env)');
  process.exit(1);
}

const client = createClient({
  username: REDIS_USER,
  password: REDIS_PASSWORD,
  socket: { host: REDIS_HOST, port: Number(REDIS_PORT) },
});

await client.connect();

const key = (code: string) => `lang:${code}`;

/** JSON with sorted keys, so two documents compare by content only. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;

  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

const done: string[] = [];
const left: string[] = [];

async function seed(entry: Entry) {
  if ((await client.exists(entry.codes.map(key))) > 0) {
    left.push(entry.id);
    return;
  }

  const stored = DRY_RUN
    ? 'OK'
    : await client.json.set(
        key(entry.id),
        '$',
        entry.data as unknown as Parameters<typeof client.json.set>[2],
        { NX: true },
      );

  (stored === 'OK' ? done : left).push(entry.id);
}

async function remove(entry: Entry) {
  const stored = await client.json.get(key(entry.id));

  if (stored === null) return;

  if (canonical(stored) !== canonical(entry.data)) {
    left.push(entry.id);
    return;
  }

  if (!DRY_RUN) await client.del(key(entry.id));
  done.push(entry.id);
}

try {
  for (let i = 0; i < selected.length; i += BATCH) {
    await Promise.all(selected.slice(i, i + BATCH).map(REMOVE ? remove : seed));
  }
} finally {
  await client.quit();
}

const verb = REMOVE ? 'removed' : 'created';
const prefix = DRY_RUN ? '[dry run] would have ' : '';

console.log(
  `${prefix}${verb} ${done.length} of ${selected.length} languages (inactive)`,
);

if (left.length) {
  console.log(
    REMOVE
      ? `kept ${left.length}, changed since the seed: ${left.join(', ')}`
      : `skipped ${left.length}, already in the catalogue: ${left.join(', ')}`,
  );
}
