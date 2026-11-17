/**
 * Writes the names of the languages of `languages.json` (`meta.exonyms`) into
 * the `Exonyms` messages of every locale and declares them in
 * `src/i18n/messages-schema.json`, so the game, the pickers, the emails and the
 * mobile app name them in the reader's language.
 *
 * A name already in the messages is never replaced: the catalogue's own
 * languages and any name corrected by hand keep theirs, and re-running it
 * after a new `wals:build` only adds what is missing. Keys stay sorted.
 *
 *   node scripts/wals/write-exonyms.ts --dry-run
 *   node scripts/wals/write-exonyms.ts
 *
 * Then copy the messages into the mobile app (`dart run tool/sync_shared.dart`
 * from `mobile/`).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES = ['en', 'es', 'pt'] as const;

type Locale = (typeof LOCALES)[number];

type Entry = {
  id: string;
  meta: { exonyms: Record<Locale, string>; translated: Locale[] };
};

const ROOT = join(import.meta.dirname, '..', '..');
const SCHEMA = join(ROOT, 'src/i18n/messages-schema.json');
const DRY_RUN = process.argv.includes('--dry-run');

const { languages } = JSON.parse(
  readFileSync(join(import.meta.dirname, 'languages.json'), 'utf8'),
) as { languages: Entry[] };

const sorted = (record: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );

for (const locale of LOCALES) {
  const file = join(ROOT, 'messages', `${locale}.json`);
  const messages = JSON.parse(readFileSync(file, 'utf8'));
  const exonyms: Record<string, string> = messages.Exonyms;
  const missing = languages.filter(({ id }) => !(id in exonyms));
  const translated = missing.filter(
    ({ meta }) => locale === 'en' || meta.translated.includes(locale),
  );

  for (const { id, meta } of missing) {
    exonyms[id] = meta.exonyms[locale];
  }

  messages.Exonyms = sorted(exonyms);
  console.log(
    `${locale}: ${missing.length} names added (${translated.length} translated, the rest in English)`,
  );

  if (!DRY_RUN) {
    writeFileSync(file, `${JSON.stringify(messages, null, 2)}\n`);
  }
}

const schema = JSON.parse(readFileSync(SCHEMA, 'utf8'));
const group = schema.properties.Exonyms;
const undeclared = languages.filter(({ id }) => !(id in group.properties));

for (const { id } of undeclared) {
  group.properties[id] = { type: 'string' };
}

group.properties = sorted(group.properties);
group.required = Object.keys(group.properties);
console.log(`schema: ${undeclared.length} keys declared`);

if (!DRY_RUN) {
  writeFileSync(SCHEMA, `${JSON.stringify(schema, null, 2)}\n`);
  // The schema is formatted by biome (short arrays on one line).
  execFileSync('pnpm', ['exec', 'biome', 'format', '--write', SCHEMA], {
    cwd: ROOT,
    stdio: 'inherit',
  });
} else {
  console.log('dry run: nothing written');
}
