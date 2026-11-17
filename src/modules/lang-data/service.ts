import { sha256 } from '@oslojs/crypto/sha2';
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from '@oslojs/encoding';
import { and, desc, eq, type InferSelectModel, lt } from 'drizzle-orm';
import * as jose from 'jose';
import { JWTExpired } from 'jose/errors';
import { getClient } from '@/core/database/redis/config';
import {
  getObjectByKey,
  setObjectToKey,
} from '@/core/database/redis/key-getters';
import { db } from '@/core/database/relational/config';
import {
  changeRequestTable,
  langPermissionTable,
  langTokenTable,
  languageRequestTable,
  userTable,
} from '@/core/database/relational/tables';
import { normalizeFlag } from '@/core/lib/flags';
import { flagKey, requestFlagKey } from '@/core/lib/flags-config';
import { matchRank, normalizeSearchText, searchTerms } from '@/core/lib/search';
import {
  copyObject,
  deleteObject,
  publicUrl,
  putObject,
} from '@/core/lib/storage';
import { pickRandom } from '@/core/lib/utils';
import { langManagedFields } from '@/core/schemas/lang';
import type {
  FeatureStatus,
  LangFeatures,
  Language,
  LanguageData,
  LanguageDataBody,
} from '@/core/types';
import {
  sendChangeRequestResolvedEmail,
  sendLanguageRequestResolvedEmail,
} from './emails';
import { languageCursorSchema } from './schemas/language-page';
import type {
  AdminChangeRequestDTO,
  AdminLanguageRequestDTO,
  ChangeRequestDTO,
  ChangeRequestReview,
  CreateLanguageRequestResult,
  FeatureChangeRequest,
  LanguageName,
  LanguagePageOptions,
  LanguagePageResult,
  LanguagePageSort,
  LanguageRequestDTO,
  LanguageRequestValues,
  LanguagesSummary,
  ReviewChangeRequestResult,
  ReviewLanguageRequestResult,
  SetPermissionResult,
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

/* -------------------------------------------------------------------------- */
/*                             Editing permissions                            */
/* -------------------------------------------------------------------------- */

function hashPermissionCode(code: string) {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(code)));
}

function getJwtSecret() {
  return jose.base64url.decode(process.env.JWT_SECRET);
}

export async function getUserLangPermissions(userId: string) {
  try {
    const permissions = await db
      .select({ lang: langPermissionTable.lang })
      .from(langPermissionTable)
      .where(eq(langPermissionTable.userId, userId));

    return permissions.map(permission => permission.lang);
  } catch (error) {
    console.error('Error fetching user lang permissions:', error);
    return [];
  }
}

export async function canEditLanguage(
  user: { id: string; admin: boolean },
  langId: string,
) {
  if (user.admin) {
    return true;
  }

  const permissions = await getUserLangPermissions(user.id);
  return permissions.includes(langId);
}

export async function createLangPermissionToken(lang: string) {
  try {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const code = encodeBase32LowerCaseNoPadding(bytes);

    const jwt = await new jose.EncryptJWT({ lang, code })
      .setExpirationTime('30m')
      .setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
      .encrypt(getJwtSecret());

    await db
      .insert(langTokenTable)
      .values({ lang, code: hashPermissionCode(code) });

    return jwt;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function setUserPermission(
  jwt: string,
  userId: string,
): Promise<SetPermissionResult> {
  try {
    const user = await db.query.userTable.findFirst({
      where: eq(userTable.id, userId),
    });

    if (!user) {
      return { success: false, key: 'userNotFound' };
    }

    if (user.admin) {
      return { success: false, key: 'userIsAdmin' };
    }

    const { payload } = await jose.jwtDecrypt<{ lang: string; code: string }>(
      jwt,
      getJwtSecret(),
    );

    const encoded = hashPermissionCode(payload.code);

    // Deleting is what claims the token: a single statement, so of two users
    // redeeming it at once only one gets the row back.
    const [langToken] = await db
      .delete(langTokenTable)
      .where(eq(langTokenTable.code, encoded))
      .returning({ lang: langTokenTable.lang });

    if (!langToken) {
      return { success: false, key: 'tokenNotFound' };
    }

    const { lang } = langToken;

    const granted = await db
      .insert(langPermissionTable)
      .values({ userId, lang })
      .onConflictDoNothing()
      .returning();

    if (granted.length === 0) {
      return { success: false, key: 'userHasPermission' };
    }

    return { success: true, lang };
  } catch (error) {
    console.error(error);

    if (error instanceof JWTExpired) {
      return { success: false, key: 'tokenExpired' };
    }

    return { success: false, key: 'unknown' };
  }
}

/** Used by the cron job that keeps the permission tokens table clean. */
export async function deleteExpiredLangTokens() {
  await db
    .delete(langTokenTable)
    .where(lt(langTokenTable.expiresAt, new Date()));
}

/* -------------------------------------------------------------------------- */
/*                               Change requests                              */
/* -------------------------------------------------------------------------- */

export async function createChangeRequest(change: FeatureChangeRequest) {
  try {
    await db.insert(changeRequestTable).values(change);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

const changeRequestColumns = {
  id: changeRequestTable.id,
  lang: changeRequestTable.lang,
  feature: changeRequestTable.feature,
  status: changeRequestTable.status,
  description: changeRequestTable.description,
  state: changeRequestTable.state,
  rejectionReason: changeRequestTable.rejectionReason,
  createdAt: changeRequestTable.createdAt,
  reviewedAt: changeRequestTable.reviewedAt,
};

type ChangeRequestRow = Pick<
  InferSelectModel<typeof changeRequestTable>,
  keyof typeof changeRequestColumns
>;

function toChangeRequestDTO(row: ChangeRequestRow): ChangeRequestDTO {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

/** The requests a user made, newest first. */
export async function getUserChangeRequests(userId: string) {
  try {
    const rows = await db
      .select(changeRequestColumns)
      .from(changeRequestTable)
      .where(eq(changeRequestTable.userId, userId))
      .orderBy(desc(changeRequestTable.createdAt));

    return rows.map(toChangeRequestDTO);
  } catch (e) {
    console.error(e);
    return null;
  }
}

/**
 * Every request with its author, newest first. Pending ones carry the status
 * the feature has right now so the reviewer sees what would change.
 */
export async function getChangeRequests(
  state?: ChangeRequestRow['state'],
): Promise<AdminChangeRequestDTO[] | null> {
  try {
    const rows = await db
      .select({
        ...changeRequestColumns,
        user: { id: userTable.id, nickname: userTable.nickname },
      })
      .from(changeRequestTable)
      .innerJoin(userTable, eq(changeRequestTable.userId, userTable.id))
      .where(state ? eq(changeRequestTable.state, state) : undefined)
      .orderBy(desc(changeRequestTable.createdAt))
      .limit(200);

    const langIds = [
      ...new Set(
        rows.filter(row => row.state === 'pending').map(row => row.lang),
      ),
    ];
    const langs = new Map(
      (await Promise.all(langIds.map(getLanguageById))).map(lang => [
        lang?.id,
        lang,
      ]),
    );

    return rows.map(({ user, ...row }) => {
      const lang = langs.get(row.lang);

      return {
        ...toChangeRequestDTO(row),
        user,
        currentStatus: lang ? getFeatureStatus(lang, row.feature) : null,
      };
    });
  } catch (e) {
    console.error(e);
    return null;
  }
}

/**
 * Accepts or rejects a pending request. The request is claimed first, with a
 * conditional update, so two administrators can never resolve it twice; the
 * claim is released again if the language could not be updated.
 */
export async function reviewChangeRequest(
  id: string,
  reviewerId: string,
  review: ChangeRequestReview,
): Promise<ReviewChangeRequestResult> {
  try {
    const found = await db
      .select({
        lang: changeRequestTable.lang,
        feature: changeRequestTable.feature,
        status: changeRequestTable.status,
        locale: changeRequestTable.locale,
        email: userTable.email,
        nickname: userTable.nickname,
      })
      .from(changeRequestTable)
      .innerJoin(userTable, eq(changeRequestTable.userId, userTable.id))
      .where(eq(changeRequestTable.id, id));

    const request = found[0];

    if (!request) {
      return { success: false, key: 'requestNotFound' };
    }

    const lang = await getLanguageById(request.lang);

    if (review.decision === 'accept' && !lang) {
      return { success: false, key: 'langNotFound' };
    }

    const claimed = await db
      .update(changeRequestTable)
      .set({
        state: review.decision === 'accept' ? 'accepted' : 'rejected',
        rejectionReason: review.decision === 'reject' ? review.reason : null,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
      })
      .where(
        and(
          eq(changeRequestTable.id, id),
          eq(changeRequestTable.state, 'pending'),
        ),
      )
      .returning(changeRequestColumns);

    if (claimed.length === 0) {
      return { success: false, key: 'requestAlreadyReviewed' };
    }

    if (review.decision === 'accept' && lang) {
      const { id: langId, ...data } = lang;
      const updated = await setLanguageData(
        langId,
        applyFeatureStatus(data, request.feature, request.status),
      );

      if (!updated) {
        await db
          .update(changeRequestTable)
          .set({
            state: 'pending',
            rejectionReason: null,
            reviewedAt: null,
            reviewedBy: null,
          })
          .where(eq(changeRequestTable.id, id));

        return { success: false, key: 'unknown' };
      }
    }

    const emailSent = await sendChangeRequestResolvedEmail({
      to: request.email,
      nickname: request.nickname,
      locale: request.locale,
      langId: request.lang,
      langName: lang?.name ?? request.lang,
      feature: request.feature,
      status: request.status,
      reason: review.decision === 'reject' ? review.reason : undefined,
    });

    return {
      success: true,
      request: toChangeRequestDTO(claimed[0]),
      emailSent,
    };
  } catch (e) {
    console.error(e);
    return { success: false, key: 'unknown' };
  }
}

/* -------------------------------------------------------------------------- */
/*                              Language requests                             */
/* -------------------------------------------------------------------------- */

const PENDING_CODE_CONSTRAINT = 'language_request_pending_code';

/** Whether `error` is the unique index that allows one open request per code. */
function isPendingCodeConflict(error: unknown) {
  // drizzle wraps what the driver throws; the driver's error is the `cause`.
  const cause =
    error instanceof Error && error.cause !== undefined ? error.cause : error;

  return (
    typeof cause === 'object' &&
    cause !== null &&
    (cause as { constraint?: unknown }).constraint === PENDING_CODE_CONSTRAINT
  );
}

const languageRequestColumns = {
  id: languageRequestTable.id,
  code: languageRequestTable.code,
  name: languageRequestTable.name,
  exonym: languageRequestTable.exonym,
  features: languageRequestTable.features,
  partial: languageRequestTable.partial,
  description: languageRequestTable.description,
  flagKey: languageRequestTable.flagKey,
  state: languageRequestTable.state,
  rejectionReason: languageRequestTable.rejectionReason,
  createdAt: languageRequestTable.createdAt,
  reviewedAt: languageRequestTable.reviewedAt,
};

type LanguageRequestRow = Pick<
  InferSelectModel<typeof languageRequestTable>,
  keyof typeof languageRequestColumns
>;

function toLanguageRequestDTO({
  flagKey: key,
  ...row
}: LanguageRequestRow): LanguageRequestDTO {
  const flag =
    row.state === 'accepted'
      ? flagKey(row.code)
      : row.state === 'pending'
        ? key
        : null;

  return {
    ...row,
    flagUrl: flag ? publicUrl(flag) : null,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

async function hasPendingLanguageRequest(code: string) {
  const found = await db
    .select({ id: languageRequestTable.id })
    .from(languageRequestTable)
    .where(
      and(
        eq(languageRequestTable.code, code),
        eq(languageRequestTable.state, 'pending'),
      ),
    )
    .limit(1);

  return found.length > 0;
}

/**
 * Stores a request for a language that is not in the game yet. The flag is
 * normalized to a WebP and uploaded first; if the row cannot be written the
 * upload is deleted again, so the bucket never keeps orphans.
 */
export async function createLanguageRequest(
  userId: string,
  data: LanguageRequestValues & { locale?: string },
  flag: Uint8Array,
): Promise<CreateLanguageRequestResult> {
  try {
    if (await getLanguageById(data.code)) {
      return { success: false, key: 'langExists' };
    }

    if (await hasPendingLanguageRequest(data.code)) {
      return { success: false, key: 'requestPending' };
    }

    const webp = await normalizeFlag(flag);

    if (!webp) {
      return { success: false, key: 'invalidFlag' };
    }

    const id = crypto.randomUUID();
    const key = requestFlagKey(id);

    if (!(await putObject(key, webp, 'image/webp'))) {
      return { success: false, key: 'unknown' };
    }

    try {
      const [row] = await db
        .insert(languageRequestTable)
        .values({
          id,
          userId,
          code: data.code,
          name: data.name,
          exonym: data.exonym ?? null,
          features: [...data.features].sort(),
          partial: [...data.partial].sort(),
          description: data.description,
          flagKey: key,
          locale: data.locale ?? 'en',
        })
        .returning(languageRequestColumns);

      return { success: true, request: toLanguageRequestDTO(row) };
    } catch (e) {
      await deleteObject(key);

      if (isPendingCodeConflict(e)) {
        return { success: false, key: 'requestPending' };
      }

      throw e;
    }
  } catch (e) {
    console.error(e);
    return { success: false, key: 'unknown' };
  }
}

/** The language requests a user made, newest first. */
export async function getUserLanguageRequests(userId: string) {
  try {
    const rows = await db
      .select(languageRequestColumns)
      .from(languageRequestTable)
      .where(eq(languageRequestTable.userId, userId))
      .orderBy(desc(languageRequestTable.createdAt));

    return rows.map(toLanguageRequestDTO);
  } catch (e) {
    console.error(e);
    return null;
  }
}

/** Every language request with its author, newest first. */
export async function getLanguageRequests(
  state?: LanguageRequestRow['state'],
): Promise<AdminLanguageRequestDTO[] | null> {
  try {
    const rows = await db
      .select({
        ...languageRequestColumns,
        user: { id: userTable.id, nickname: userTable.nickname },
      })
      .from(languageRequestTable)
      .innerJoin(userTable, eq(languageRequestTable.userId, userTable.id))
      .where(state ? eq(languageRequestTable.state, state) : undefined)
      .orderBy(desc(languageRequestTable.createdAt))
      .limit(200);

    return rows.map(({ user, ...row }) => ({
      ...toLanguageRequestDTO(row),
      user,
    }));
  } catch (e) {
    console.error(e);
    return null;
  }
}

/**
 * Accepts or rejects a pending language request, claimed first with a
 * conditional update like `reviewChangeRequest`. Accepting creates the
 * language inactive, lets the requester edit it and publishes the flag; if any
 * of that fails the claim is released again. Rejecting deletes the upload.
 */
export async function reviewLanguageRequest(
  id: string,
  reviewerId: string,
  review: ChangeRequestReview,
): Promise<ReviewLanguageRequestResult> {
  try {
    const found = await db
      .select({
        ...languageRequestColumns,
        userId: languageRequestTable.userId,
        locale: languageRequestTable.locale,
        email: userTable.email,
        nickname: userTable.nickname,
      })
      .from(languageRequestTable)
      .innerJoin(userTable, eq(languageRequestTable.userId, userTable.id))
      .where(eq(languageRequestTable.id, id));

    const request = found[0];

    if (!request) {
      return { success: false, key: 'requestNotFound' };
    }

    if (request.state !== 'pending') {
      return { success: false, key: 'requestAlreadyReviewed' };
    }

    const accept = review.decision === 'accept';

    if (accept && (await getLanguageById(request.code))) {
      return { success: false, key: 'langExists' };
    }

    const claimed = await db
      .update(languageRequestTable)
      .set({
        state: accept ? 'accepted' : 'rejected',
        rejectionReason: review.decision === 'reject' ? review.reason : null,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
      })
      .where(
        and(
          eq(languageRequestTable.id, id),
          eq(languageRequestTable.state, 'pending'),
        ),
      )
      .returning(languageRequestColumns);

    if (claimed.length === 0) {
      return { success: false, key: 'requestAlreadyReviewed' };
    }

    if (accept) {
      const published = await publishLanguage(request);

      if (!published) {
        await db
          .update(languageRequestTable)
          .set({
            state: 'pending',
            rejectionReason: null,
            reviewedAt: null,
            reviewedBy: null,
          })
          .where(eq(languageRequestTable.id, id));

        return { success: false, key: 'unknown' };
      }
    }

    // The pending upload is no longer needed: copied when accepted, unwanted
    // when rejected. A failure only leaves an unreferenced object behind.
    await deleteObject(request.flagKey);

    const emailSent = await sendLanguageRequestResolvedEmail({
      to: request.email,
      nickname: request.nickname,
      locale: request.locale,
      langId: request.code,
      langName: request.name,
      reason: review.decision === 'reject' ? review.reason : undefined,
    });

    return {
      success: true,
      request: toLanguageRequestDTO(claimed[0]),
      emailSent,
    };
  } catch (e) {
    console.error(e);
    return { success: false, key: 'unknown' };
  }
}

/** Puts an accepted request in the catalogue: flag, language and permission. */
async function publishLanguage(
  request: LanguageRequestRow & { userId: string },
) {
  if (!(await copyObject(request.flagKey, flagKey(request.code)))) {
    return false;
  }

  const created = await setLanguageData(request.code, {
    name: request.name,
    ...(request.exonym ? { exonym: request.exonym } : {}),
    features: request.features,
    partial: request.partial,
    active: false,
    searchParams: [
      ...new Set(
        [request.name, request.exonym, request.code].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    ],
  });

  if (!created) {
    await deleteObject(flagKey(request.code));
    return false;
  }

  try {
    await db
      .insert(langPermissionTable)
      .values({ userId: request.userId, lang: request.code })
      .onConflictDoNothing();
  } catch (e) {
    // The language exists either way; an admin can still share the permission.
    console.error('Permission for the requester could not be set:', e);
  }

  return true;
}
