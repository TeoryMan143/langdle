import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { langFeatures } from '@/core/lib/features';
import { langDataSchema } from '@/core/schemas/lang';
import { LANG_CODE_PATTERN } from '@/modules/lang-data/schemas/language-request';

type Entry = {
  id: string;
  codes: string[];
  data: Record<string, unknown> & {
    name: string;
    features: string[];
    partial: string[];
  };
  meta: {
    known: number;
    unknown: string[];
    exonyms: Record<Locale, string>;
    translated: Locale[];
  };
};

const locales = ['en', 'es', 'pt'] as const;

type Locale = (typeof locales)[number];

const { header, languages, existing } = JSON.parse(
  readFileSync('scripts/wals/languages.json', 'utf8'),
) as {
  header: { catalogue: string[] };
  languages: Entry[];
  existing: Entry[];
};

const messages = Object.fromEntries(
  locales.map(locale => [
    locale,
    JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')).Exonyms,
  ]),
) as Record<Locale, Record<string, string>>;

const schema = JSON.parse(readFileSync('src/i18n/messages-schema.json', 'utf8'))
  .properties.Exonyms as { properties: object; required: string[] };

// The languages the catalogue had before WALS: write-exonyms.ts gave the WALS
// ones exonyms too.
const ids = new Set(languages.map(({ id }) => id));
const catalogue = Object.keys(messages.en).filter(code => !ids.has(code));

describe('the WALS languages dataset', () => {
  test('has languages', () => {
    expect(languages.length).toBeGreaterThan(1000);
  });

  // update-existing.ts drops every stored feature outside this list.
  test('was built against the current catalogue', () => {
    expect(header.catalogue).toEqual([...langFeatures]);
  });

  test('ranks every language for the review queue', () => {
    expect(
      languages.filter(({ data }) => typeof data.coverage !== 'number'),
    ).toEqual([]);
  });

  test('describes existing languages only with catalogue features', () => {
    const invalid = existing.filter(
      ({ data }) =>
        !langDataSchema
          .pick({ features: true, partial: true, locations: true })
          .safeParse(data).success,
    );

    expect(invalid.map(({ id }) => id)).toEqual([]);
    expect(existing.every(({ id, codes }) => codes.includes(id))).toBe(true);
  });

  test('stores exactly what the catalogue accepts', () => {
    const invalid = languages.filter(
      ({ data }) => !langDataSchema.strict().safeParse(data).success,
    );

    expect(invalid.map(({ id }) => id)).toEqual([]);
  });

  test('keys every language by a unique catalogue code', () => {
    const ids = languages.map(({ id }) => id);

    expect(ids.filter(id => !LANG_CODE_PATTERN.test(id))).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(languages.every(({ id, codes }) => codes.includes(id))).toBe(true);
  });

  test('never replaces a language the catalogue already has', () => {
    const codes = languages.flatMap(({ codes }) => codes);

    expect(catalogue.length).toBeGreaterThan(0);
    expect(codes.filter(code => catalogue.includes(code))).toEqual([]);
  });

  test('names every language in every locale', () => {
    const unnamed = languages.filter(({ meta }) =>
      locales.some(locale => !meta.exonyms[locale]?.trim()),
    );

    expect(unnamed.map(({ id }) => id)).toEqual([]);
  });

  // pnpm wals:exonyms, after a build that adds languages.
  test('has its names in the Exonyms messages', () => {
    for (const locale of locales) {
      expect(
        languages.filter(({ id }) => !messages[locale][id]).map(({ id }) => id),
      ).toEqual([]);
    }

    expect(languages.filter(({ id }) => !schema.required.includes(id))).toEqual(
      [],
    );
  });

  test('keeps the Exonyms messages of every locale in sync', () => {
    for (const locale of locales) {
      expect(Object.keys(messages[locale])).toEqual(schema.required);
      expect(Object.keys(schema.properties)).toEqual(schema.required);
    }
  });

  test('adds every language inactive', () => {
    expect(languages.filter(({ data }) => data.active !== false)).toEqual([]);
  });

  test('gives each feature a single status', () => {
    const twice = languages.filter(({ data }) =>
      data.features.some(feature => data.partial.includes(feature)),
    );

    expect(twice.map(({ id }) => id)).toEqual([]);
  });

  test('lists as unknown only catalogue features it did not store', () => {
    const wrong = languages.filter(({ data, meta }) =>
      meta.unknown.some(
        feature =>
          !(langFeatures as readonly string[]).includes(feature) ||
          data.features.includes(feature) ||
          data.partial.includes(feature),
      ),
    );

    expect(wrong.map(({ id }) => id)).toEqual([]);
  });
});
