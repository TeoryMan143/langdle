import { sha256 } from '@oslojs/crypto/sha2';
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from '@oslojs/encoding';
import { and, eq, lt } from 'drizzle-orm';
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
import type { Language, LanguageData } from '@/core/types';
import type { FeatureChangeRequest, SetPermissionResult } from './types';

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
