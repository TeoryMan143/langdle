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
  userTable,
} from '@/core/database/relational/tables';
import { pickRandom } from '@/core/lib/utils';
import type {
  FeatureStatus,
  LangFeatures,
  Language,
  LanguageData,
} from '@/core/types';
import { sendChangeRequestResolvedEmail } from './emails';
import type {
  AdminChangeRequestDTO,
  ChangeRequestDTO,
  ChangeRequestReview,
  FeatureChangeRequest,
  ReviewChangeRequestResult,
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
  return jose.base64url.decode(process.env.JWT_SECRET as string);
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

    const langToken = await db.query.langTokenTable.findFirst({
      where: eq(langTokenTable.code, encoded),
    });

    if (!langToken) {
      return { success: false, key: 'tokenNotFound' };
    }

    const lang = langToken.lang;

    const permission = await db.query.langPermissionTable.findFirst({
      where: and(
        eq(langPermissionTable.lang, lang),
        eq(langPermissionTable.userId, userId),
      ),
    });

    await db.delete(langTokenTable).where(eq(langTokenTable.code, encoded));

    if (permission) {
      return { success: false, key: 'userHasPermission' };
    }

    await db.insert(langPermissionTable).values({ userId, lang });

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
