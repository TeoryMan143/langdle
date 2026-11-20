import { getClient } from '@/core/database/redis/config';
import {
  getObjectByKey,
  setObjectToKey,
} from '@/core/database/redis/key-getters';
import { matchRank, normalizeSearchText, searchTerms } from '@/core/lib/search';
import { pickRandom } from '@/core/lib/utils';
import { langManagedFields } from '@/core/schemas/lang';
import type {
  FeatureStatus,
  LangFeatures,
  Language,
  LanguageData,
  LanguageDataBody,
} from '@/core/types';
import { languageCursorSchema } from './schemas/language-page';
import type {
  LanguageName,
  LanguagePageOptions,
  LanguagePageResult,
  LanguagePageSort,
  LanguagesSummary,
} from './types';

/* -------------------------------------------------------------------------- */
/*                          Languages (redis storage)                         */
/* -------------------------------------------------------------------------- */

const LANG_GROUP = 'lang';
const LANG_INDEX = 'idx:langs';
const LANG_FIELDS = [
  '$.name',
  '$.exonym',
  '$.features',
  '$.active',
  '$.partial',
  '$.searchParams',
  '$.locations',
  '$.family',
  '$.genus',
  '$.coverage',
] as const;

interface SearchDocumentValue {
  [key: string]:
    | string
    | number
    | null
    | Array<SearchDocumentValue>
    | SearchDocumentValue;
}

type Doc = {
  id: string;
  value: SearchDocumentValue;
};

/** A returned JSON path that is not a plain string: an object or a number. */
function parsedField<T>(value: Doc['value'][string] | undefined) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return (typeof value === 'string' ? JSON.parse(value) : value) as T;
}

function docToLanguage(doc: Doc): Language {
  const { value } = doc;
  const locations = parsedField<Language['locations']>(value['$.locations']);
  const coverage = parsedField<number>(value['$.coverage']);

  return {
    id: doc.id.slice(LANG_GROUP.length + 1),
    name: value['$.name'] as string,
    exonym: value['$.exonym'] as string,
    features: JSON.parse((value['$.features'] as string) ?? '[]'),
    active: value['$.active'] === '1',
    partial: JSON.parse((value['$.partial'] as string) ?? '[]'),
    searchParams: JSON.parse((value['$.searchParams'] as string) ?? '[]'),
    ...(locations?.length ? { locations } : {}),
    ...(value['$.family'] ? { family: value['$.family'] as string } : {}),
    ...(value['$.genus'] ? { genus: value['$.genus'] as string } : {}),
    ...(coverage !== undefined ? { coverage } : {}),
  };
}

export async function getLanguageById(
  id: string,
): Promise<Language | undefined> {
  const data = (await getObjectByKey(LANG_GROUP, id)) as
    | LanguageData
    | undefined;

  if (!data) {
    return undefined;
  }

  return { id, ...data };
}

/** FT.SEARCH answers one page at a time; the catalogue spans several. */
const LANG_SEARCH_BATCH = 1000;
const ACTIVE_LANGS_QUERY = '@active:{true}';

/**
 * Every document matching `query`, with only the `fields` asked for. The first
 * batch tells how many there are, the rest are fetched in parallel.
 */
async function searchAllDocs(
  query: string,
  fields: readonly string[],
): Promise<Doc[]> {
  const client = await getClient();
  const search = (from: number) =>
    client.ft.search(LANG_INDEX, query, {
      RETURN: [...fields],
      LIMIT: { from, size: LANG_SEARCH_BATCH },
    });

  const first = await search(0);
  const batches = Math.ceil(first.total / LANG_SEARCH_BATCH);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, batches - 1) }, (_, i) =>
      search((i + 1) * LANG_SEARCH_BATCH),
    ),
  );

  return [first, ...rest].flatMap(results => results.documents);
}

const nameCollator = new Intl.Collator();

/** Case-insensitive name order, then the id: a strict order of languages. */
function compareNames(a: Pick<Language, 'name' | 'id'>, b: typeof a) {
  return (
    nameCollator.compare(
      a.name.toLocaleLowerCase(),
      b.name.toLocaleLowerCase(),
    ) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

export async function getAllLanguages(onlyActives = false) {
  const documents = await searchAllDocs(
    onlyActives ? ACTIVE_LANGS_QUERY : '*',
    LANG_FIELDS,
  );

  return documents.map(docToLanguage).sort(compareNames);
}

/* ------------------------------ Search index ------------------------------ */

/** What paging and search need of a language: no features, no places. */
type IndexedLanguage = LanguageName & {
  active: boolean;
  coverage?: number;
  /** Its id and names, through `searchTerms`. */
  terms: string[];
};

/**
 * How long an instance reuses the index before reading Redis again. Writes
 * through this service drop it at once; other instances, and the offline
 * scripts that write Redis directly, are seen within this delay.
 */
const LANGUAGE_INDEX_TTL_MS = 30_000;

let languageIndex: {
  expiresAt: number;
  entries: Promise<IndexedLanguage[]>;
} | null = null;

async function loadLanguageIndex(): Promise<IndexedLanguage[]> {
  const documents = await searchAllDocs('*', [
    '$.name',
    '$.exonym',
    '$.searchParams',
    '$.active',
    '$.coverage',
  ]);

  return documents
    .map(({ id: key, value }) => {
      const coverage = parsedField<number>(value['$.coverage']);
      const exonym = value['$.exonym'] as string | undefined;
      const language: LanguageName = {
        id: key.slice(LANG_GROUP.length + 1),
        name: (value['$.name'] as string | undefined) ?? '',
        ...(exonym ? { exonym } : {}),
        searchParams: parsedField<string[]>(value['$.searchParams']) ?? [],
      };

      return {
        ...language,
        active: value['$.active'] === '1',
        ...(coverage !== undefined ? { coverage } : {}),
        terms: searchTerms(language),
      };
    })
    .sort(compareNames);
}

/** The index of every language, shared by the requests of this instance. */
function getLanguageIndex() {
  if (!languageIndex || languageIndex.expiresAt <= Date.now()) {
    const cached = {
      expiresAt: Date.now() + LANGUAGE_INDEX_TTL_MS,
      entries: loadLanguageIndex(),
    };

    languageIndex = cached;
    // A failed read must not be served until it expires.
    cached.entries.catch(() => {
      if (languageIndex === cached) {
        languageIndex = null;
      }
    });
  }

  return languageIndex.entries;
}

/** Forgets the index, so the next read sees the latest languages. */
export function clearLanguageIndex() {
  languageIndex = null;
}

/**
 * The names of the catalogue (or of its playable or unplayable part), by
 * name: what a picker needs to search in the browser, without the features.
 */
export async function getLanguageNames(
  active?: boolean,
): Promise<LanguageName[] | null> {
  try {
    return (await getLanguageIndex())
      .filter(language => active === undefined || language.active === active)
      .map(({ id, name, exonym, searchParams }) => ({
        id,
        name,
        ...(exonym ? { exonym } : {}),
        searchParams,
      }));
  } catch (e) {
    console.error(e);
    return null;
  }
}

/* ---------------------------------- Paging --------------------------------- */

/**
 * Where a language sits in one listing: `[rank, order, name, id]`. `rank` is
 * the search match (`0` without a query), `order` the sort's own number (`0`
 * by name, minus the coverage by coverage); name and id break the ties, so the
 * order is strict, which keyset paging relies on.
 */
type LanguageSortKey = readonly [
  rank: number,
  order: number,
  name: string,
  id: string,
];

function compareSortKeys(a: LanguageSortKey, b: LanguageSortKey) {
  return (
    a[0] - b[0] ||
    a[1] - b[1] ||
    compareNames({ name: a[2], id: a[3] }, { name: b[2], id: b[3] })
  );
}

function sortOrder(language: IndexedLanguage, sort: LanguagePageSort) {
  // Best described first; languages never imported (no coverage) go last.
  return sort === 'coverage' ? -(language.coverage ?? -1) : 0;
}

export function encodeLanguageCursor(key: LanguageSortKey) {
  return Buffer.from(JSON.stringify(key)).toString('base64url');
}

/** `null` when the cursor was not made by `encodeLanguageCursor`. */
export function decodeLanguageCursor(cursor: string): LanguageSortKey | null {
  try {
    const parsed = languageCursorSchema.safeParse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')),
    );

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Index of the first key strictly after `after` in the sorted `keys`. */
function indexAfter(keys: LanguageSortKey[], after: LanguageSortKey) {
  let low = 0;
  let high = keys.length;

  while (low < high) {
    const middle = (low + high) >> 1;

    if (compareSortKeys(keys[middle], after) <= 0) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}

/** The stored languages of `ids`, in that order, skipping missing ones. */
async function getStoredLanguages(ids: string[]): Promise<Language[]> {
  if (ids.length === 0) {
    return [];
  }

  const client = await getClient();
  const stored = (await client.json.mGet(
    ids.map(id => `${LANG_GROUP}:${id}`),
    '$',
  )) as unknown as Array<[LanguageData] | null>;

  return stored.flatMap((data, i) =>
    data?.[0] ? [{ id: ids[i], ...data[0] }] : [],
  );
}

/**
 * One batch of a listing of the catalogue, after the language the `cursor`
 * points at (keyset paging: a language added or removed between two calls
 * never shifts the batches). With a `query`, only the languages matching it,
 * best matches first. The listing is computed on the cached index; the full
 * documents are read for the batch alone.
 */
export async function getLanguagesPage({
  limit,
  cursor,
  active,
  sort = 'name',
  query,
}: LanguagePageOptions): Promise<LanguagePageResult> {
  const after = cursor === undefined ? undefined : decodeLanguageCursor(cursor);

  if (after === null) {
    return { success: false, key: 'invalidCursor' };
  }

  const normalizedQuery = query ? normalizeSearchText(query) : '';

  try {
    const keys: LanguageSortKey[] = [];

    for (const language of await getLanguageIndex()) {
      if (active !== undefined && language.active !== active) {
        continue;
      }

      const rank = normalizedQuery
        ? matchRank(language.terms, normalizedQuery)
        : 0;

      if (rank !== null) {
        keys.push([
          rank,
          sortOrder(language, sort),
          language.name,
          language.id,
        ]);
      }
    }

    keys.sort(compareSortKeys);

    const start = after ? indexAfter(keys, after) : 0;
    const batch = keys.slice(start, start + limit);
    const last = batch.at(-1);

    return {
      success: true,
      page: {
        items: await getStoredLanguages(batch.map(key => key[3])),
        nextCursor:
          last && start + limit < keys.length
            ? encodeLanguageCursor(last)
            : null,
        total: keys.length,
      },
    };
  } catch (e) {
    console.error(e);
    return { success: false, key: 'unknown' };
  }
}

/** The atlas counters, without sending the catalogue anywhere. */
export async function getLanguagesSummary(): Promise<LanguagesSummary | null> {
  try {
    const documents = await searchAllDocs('*', [
      '$.active',
      '$.features',
      '$.partial',
    ]);

    return documents.reduce<LanguagesSummary>(
      (summary, { value }) => ({
        languages: summary.languages + 1,
        activeLanguages:
          summary.activeLanguages + (value['$.active'] === '1' ? 1 : 0),
        activeFeatures:
          summary.activeFeatures +
          (parsedField<string[]>(value['$.features'])?.length ?? 0),
        partialFeatures:
          summary.partialFeatures +
          (parsedField<string[]>(value['$.partial'])?.length ?? 0),
      }),
      {
        languages: 0,
        activeLanguages: 0,
        activeFeatures: 0,
        partialFeatures: 0,
      },
    );
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function getLanguagesByIds(ids: string[]): Promise<Language[]> {
  const client = await getClient();

  const langsData = (await Promise.all(
    ids.map(id => client.json.get(`${LANG_GROUP}:${id}`)),
  )) as LanguageData[];

  return langsData.map((data, i) => ({ id: ids[i], ...data }));
}

export function getFeatureStatus(
  lang: Pick<LanguageData, 'features' | 'partial'>,
  feature: LangFeatures,
): FeatureStatus {
  if (lang.features.includes(feature)) {
    return 'present';
  }

  return lang.partial.includes(feature) ? 'partial' : 'absent';
}

/** Returns the language data with `feature` moved to the given status. */
export function applyFeatureStatus(
  data: LanguageData,
  feature: LangFeatures,
  status: FeatureStatus,
): LanguageData {
  const features = data.features.filter(f => f !== feature);
  const partial = data.partial.filter(f => f !== feature);

  if (status === 'present') {
    features.push(feature);
  } else if (status === 'partial') {
    partial.push(feature);
  }

  return { ...data, features: features.sort(), partial: partial.sort() };
}

export async function getRandomActiveLanguage() {
  const langs = await getAllLanguages(true);
  return langs.length === 0 ? undefined : pickRandom(langs);
}

/**
 * The language a `PUT` body describes: a managed field (locations, family,
 * genus, coverage) it leaves out keeps its stored value, one it sets to `null`
 * is removed.
 */
export function keepManagedFields(
  stored: LanguageData,
  body: LanguageDataBody,
): LanguageData {
  const data: Record<string, unknown> = { ...body };

  for (const field of langManagedFields) {
    if (body[field] === undefined && stored[field] !== undefined) {
      data[field] = stored[field];
    } else if (body[field] === null) {
      delete data[field];
    }
  }

  return data as LanguageData;
}

export async function setLanguageData(id: string, data: LanguageData) {
  const res = await setObjectToKey(LANG_GROUP, id, data);
  clearLanguageIndex();
  return res === 'OK';
}

export async function setLanguageStatus(id: string, active: boolean) {
  const client = await getClient();
  const res = await client.json.set(`${LANG_GROUP}:${id}`, '$.active', active);
  clearLanguageIndex();
  return res === 'OK';
}
