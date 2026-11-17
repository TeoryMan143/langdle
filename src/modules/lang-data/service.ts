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
import {
  copyObject,
  deleteObject,
  publicUrl,
  putObject,
} from '@/core/lib/storage';
import { pickRandom } from '@/core/lib/utils';
import type {
  FeatureStatus,
  LangFeatures,
  Language,
  LanguageData,
} from '@/core/types';
import {
  sendChangeRequestResolvedEmail,
  sendLanguageRequestResolvedEmail,
} from './emails';
import type {
  AdminChangeRequestDTO,
  AdminLanguageRequestDTO,
  ChangeRequestDTO,
  ChangeRequestReview,
  CreateLanguageRequestResult,
  FeatureChangeRequest,
  LanguageRequestDTO,
  LanguageRequestValues,
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

function docToLanguage(doc: Doc): Language {
  return {
    id: doc.id.slice(LANG_GROUP.length + 1),
    name: doc.value['$.name'] as string,
    exonym: doc.value['$.exonym'] as string,
    features: JSON.parse((doc.value['$.features'] as string) ?? '[]'),
    active: doc.value['$.active'] === '1',
    partial: JSON.parse((doc.value['$.partial'] as string) ?? '[]'),
    searchParams: JSON.parse((doc.value['$.searchParams'] as string) ?? '[]'),
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

export async function getAllLanguages(onlyActives = false) {
  const client = await getClient();

  const results = await client.ft.search(
    LANG_INDEX,
    onlyActives ? '@active:{true}' : '*',
    {
      RETURN: [...LANG_FIELDS],
      LIMIT: { from: 0, size: 50 },
    },
  );

  return results.documents
    .map(docToLanguage)
    .sort((a, b) =>
      a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()),
    );
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

export async function setLanguageData(id: string, data: LanguageData) {
  const res = await setObjectToKey(LANG_GROUP, id, data);
  return res === 'OK';
}

export async function setLanguageStatus(id: string, active: boolean) {
  const client = await getClient();
  const res = await client.json.set(`${LANG_GROUP}:${id}`, '$.active', active);
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
