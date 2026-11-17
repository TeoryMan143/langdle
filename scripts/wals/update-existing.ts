/**
 * Brings the languages already stored in Redis in line with the catalogue,
 * without overriding what an editor decided:
 *
 * 1. Cleanup: drops stored feature names the catalogue no longer has
 *    (`fusional`, `syllableTimed`…), and the hand corrections in FIXES.
 * 2. Backfill: for a language WALS describes (`languages.json`, both lists),
 *    sets the features added after it was written (BACKFILLED) and the
 *    locations, family and genus the game hints need. Features only on a
 *    language that mentions none of them yet, fields only when missing, so a
 *    re-run, or a language an editor already completed, is left alone.
 *
 * Only the changed fields are written (partial JSON.SET), after a backup of
 * every document it changes in `backups/`; `--restore=<file>` puts them back.
 * `--dry-run` prints the changes, and where WALS disagrees with the features
 * an editor stored, without writing anything.
 *
 *   node --env-file=.env scripts/wals/update-existing.ts --dry-run
 *   node --env-file=.env scripts/wals/update-existing.ts [--cleanup-only]
 *   node --env-file=.env scripts/wals/update-existing.ts --place-only
 *   node --env-file=.env scripts/wals/update-existing.ts --drop-legacy
 *   node --env-file=.env scripts/wals/update-existing.ts --restore=<backup>
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from 'redis';

type Status = 'present' | 'partial' | 'absent';

type Place = {
  locations?: Array<{ lat: number; lng: number }>;
  family?: string;
  genus?: string;
};

type StoredLanguage = Place & {
  name: string;
  /** The single point of the first version of the hints, before `locations`. */
  location?: { lat: number; lng: number };
  features?: string[];
  partial?: string[];
};

type Source = {
  id: string;
  codes: string[];
  data: Place & { features: string[]; partial: string[] };
  meta: { unknown: string[] };
};

/** Features added to the catalogue after the existing languages were made. */
const BACKFILLED = [
  'uvularConsonants',
  'frontRoundedVowels',
  'fixedStress',
  'adjectiveNoun',
  'nounAdjective',
  'genitiveNoun',
  'nounGenitive',
  'whInSitu',
  'definiteArticles',
  'indefiniteArticles',
  'genderedPronouns',
  'vigesimalNumerals',
  'teaFromCha',
  'teaFromTe',
  'handArmSameWord',
];

/** Features stored by mistake, removed from the language they are under. */
const FIXES: Record<string, Partial<Record<Status, string[]>>> = {
  // Hindustani (Hindi and Urdu, so its abjad stays).
  hi: {
    absent: [
      // No clicks, ejectives, implosives, lateral fricatives, switch reference.
      'clickConsonants',
      'ejectiveConsonants',
      'implosiveConsonants',
      'lateralFricatives',
      'switchReference',
      // WALS: SOV (81A), postpositions only (85A), no numeral classifiers
      // (55A), no inclusive/exclusive "we" (39A), no evidentials (77A).
      'svo',
      'prepositions',
      'classifierSystem',
      'inclusiveExclusiveWe',
      'evidentiality',
      // No palatalized consonants (PHOIBLE); Devanagari is an abugida and
      // the Urdu script an abjad, neither an alphabet.
      'palatalization',
      'alphabet',
    ],
    // WALS 81A, 102A (the verb agrees with its subject or object), 27A.
    present: ['sov', 'personAgreement', 'reduplication'],
    // Split by aspect and object: ergative -ne in the perfective, accusative
    // in the imperfective, tripartite with a -ko object (WALS 98A says
    // tripartite outright).
    partial: [
      'nominativeAccusativeAlignment',
      'ergativeAlignment',
      'tripartiteAlignment',
    ],
  },
};

const PLACE_FIELDS = ['locations', 'family', 'genus'] as const;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CLEANUP_ONLY = args.includes('--cleanup-only');
/**
 * Cleanup and locations, family and genus, but none of the BACKFILLED
 * features: safe before the app that knows those features is deployed.
 */
const PLACE_ONLY = args.includes('--place-only');
/**
 * Removes the single `location` of the first version of the hints. Only once
 * the app reading `locations` is deployed: the previous one reads `location`.
 */
const DROP_LEGACY = args.includes('--drop-legacy');
const RESTORE = args.find(arg => arg.startsWith('--restore='))?.split('=')[1];

const dataset = JSON.parse(
  readFileSync(join(import.meta.dirname, 'languages.json'), 'utf8'),
) as {
  header: { catalogue: string[]; withoutSource: string[] };
  languages: Source[];
  existing: Source[];
};

const catalogue = new Set(dataset.header.catalogue);

const misspelt = Object.values(FIXES)
  .flatMap(fix => Object.values(fix).flat())
  .filter(feature => !catalogue.has(feature));

if (misspelt.length) {
  console.error(`FIXES names features the catalogue lacks: ${misspelt}`);
  process.exit(1);
}
const withoutSource = new Set(dataset.header.withoutSource);
const sources = new Map<string, Source>();

for (const source of [...dataset.existing, ...dataset.languages]) {
  for (const code of source.codes) {
    if (!sources.has(code)) sources.set(code, source);
  }
}

/** What WALS (and the sources completing it) says, if anything. */
function sourceStatus(source: Source, feature: string): Status | undefined {
  if (source.data.features.includes(feature)) return 'present';
  if (source.data.partial.includes(feature)) return 'partial';

  return source.meta.unknown.includes(feature) || withoutSource.has(feature)
    ? undefined
    : 'absent';
}

function storedStatus(features: string[], partial: string[], f: string) {
  if (features.includes(f)) return 'present';
  return partial.includes(f) ? 'partial' : 'absent';
}

type Update = {
  key: string;
  patch: Partial<Record<'features' | 'partial', string[]>> & Place;
  /** Fields to delete. */
  remove: string[];
  notes: string[];
  disagreements: string[];
};

function plan(key: string, stored: StoredLanguage): Update {
  const id = key.slice('lang:'.length);
  const fix = FIXES[id] ?? {};
  const fixed = new Set(Object.values(fix).flat());
  const keep = (feature: string) =>
    catalogue.has(feature) && !fixed.has(feature);
  const storedFeatures = stored.features ?? [];
  const storedPartial = stored.partial ?? [];

  // A fixed feature is dropped wherever it is, then put where FIXES says.
  let features = [...storedFeatures.filter(keep), ...(fix.present ?? [])];
  let partial = [...storedPartial.filter(keep), ...(fix.partial ?? [])];
  const notes: string[] = [];
  const disagreements: string[] = [];
  const patch: Update['patch'] = {};

  const dropped = [...storedFeatures, ...storedPartial].filter(
    f => !features.includes(f) && !partial.includes(f),
  );
  const made = (list: string[], from: string[]) =>
    list.filter(f => fixed.has(f) && !from.includes(f));

  if (dropped.length) notes.push(`- ${dropped.join(', ')}`);
  if (made(features, storedFeatures).length) {
    notes.push(`+ ${made(features, storedFeatures).join(', ')}`);
  }
  if (made(partial, storedPartial).length) {
    notes.push(`~ ${made(partial, storedPartial).join(', ')}`);
  }

  const source = sources.get(id);

  if (source && !CLEANUP_ONLY) {
    const mentioned = BACKFILLED.some(
      f => features.includes(f) || partial.includes(f),
    );

    if (!mentioned && !PLACE_ONLY) {
      const present = BACKFILLED.filter(
        f => sourceStatus(source, f) === 'present',
      );
      const partly = BACKFILLED.filter(
        f => sourceStatus(source, f) === 'partial',
      );

      features = [...features, ...present];
      partial = [...partial, ...partly];
      if (present.length) notes.push(`+ ${present.join(', ')}`);
      if (partly.length) notes.push(`~ ${partly.join(', ')}`);
    }

    for (const field of PLACE_FIELDS) {
      if (stored[field] === undefined && source.data[field] !== undefined) {
        Object.assign(patch, { [field]: source.data[field] });
        notes.push(`${field} ${JSON.stringify(source.data[field])}`);
      }
    }
  }

  // A language WALS does not know keeps the one point it was given.
  if (
    stored.locations === undefined &&
    patch.locations === undefined &&
    stored.location
  ) {
    patch.locations = [stored.location];
    notes.push(`locations [${JSON.stringify(stored.location)}]`);
  }

  const remove: string[] = [];

  if (DROP_LEGACY && stored.location !== undefined) {
    remove.push('location');
    notes.push('- location (legacy field)');
  }

  if (source) {
    for (const feature of dataset.header.catalogue) {
      const wals = sourceStatus(source, feature);
      const now = storedStatus(features, partial, feature);

      if (!BACKFILLED.includes(feature) && wals && wals !== now) {
        disagreements.push(`${feature} ${now}→${wals}`);
      }
    }
  }

  if (JSON.stringify(features) !== JSON.stringify(storedFeatures)) {
    patch.features = features;
  }
  if (JSON.stringify(partial) !== JSON.stringify(storedPartial)) {
    patch.partial = partial;
  }

  return { key, patch, remove, notes, disagreements };
}

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

type JsonValue = Parameters<typeof client.json.set>[2];

await client.connect();

try {
  if (RESTORE) {
    const backup = JSON.parse(readFileSync(RESTORE, 'utf8')) as Record<
      string,
      JsonValue
    >;

    for (const [key, document] of Object.entries(backup)) {
      if (!DRY_RUN) await client.json.set(key, '$', document);
    }

    console.log(
      `${DRY_RUN ? '[dry run] would have restored' : 'restored'} ${Object.keys(backup).length} languages from ${RESTORE}`,
    );
  } else {
    const keys: string[] = [];
    for await (const key of client.scanIterator({
      MATCH: 'lang:*',
      COUNT: 1000,
    })) {
      keys.push(key);
    }

    const documents = new Map<string, StoredLanguage>();
    for (const key of keys.sort()) {
      const stored = await client.json.get(key);
      if (stored) documents.set(key, stored as unknown as StoredLanguage);
    }

    const updates = [...documents].map(([key, stored]) => plan(key, stored));
    const changed = updates.filter(
      ({ patch, remove }) => Object.keys(patch).length || remove.length,
    );

    for (const { key, notes, disagreements } of updates) {
      if (notes.length) console.log(`${key}\n  ${notes.join('\n  ')}`);
      if (DRY_RUN && disagreements.length) {
        console.log(`${key} WALS disagrees: ${disagreements.join(', ')}`);
      }
    }

    if (!DRY_RUN && changed.length) {
      const dir = join(import.meta.dirname, 'backups');
      const file = join(dir, `${new Date().toISOString()}.json`);

      mkdirSync(dir, { recursive: true });
      writeFileSync(
        file,
        JSON.stringify(
          Object.fromEntries(
            changed.map(({ key }) => [key, documents.get(key)]),
          ),
          null,
          2,
        ),
      );
      console.log(`backup of ${changed.length} languages: ${file}`);

      for (const { key, patch, remove } of changed) {
        for (const [field, value] of Object.entries(patch)) {
          await client.json.set(key, `$.${field}`, value as JsonValue);
        }
        for (const field of remove) {
          await client.json.del(key, `$.${field}`);
        }
      }
    }

    console.log(
      `${DRY_RUN ? '[dry run] would have updated' : 'updated'} ${changed.length} of ${documents.size} languages${CLEANUP_ONLY ? ' (cleanup only)' : PLACE_ONLY ? ' (place only)' : ''}`,
    );
  }
} finally {
  await client.quit();
}
