import { sha256 } from '@oslojs/crypto/sha2';
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from '@oslojs/encoding';
import { eq, lt } from 'drizzle-orm';
import * as jose from 'jose';
import { JWTExpired } from 'jose/errors';
import { db } from '@/core/database/relational/config';
import {
  langPermissionTable,
  langTokenTable,
  userTable,
} from '@/core/database/relational/tables';
import type { SetPermissionResult } from './types';

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

/**
 * Lets `userId` edit `lang` without a token: used when an accepted language
 * request gives its author the language. Granting it twice is not an error.
 */
export async function grantLangPermission(userId: string, lang: string) {
  await db
    .insert(langPermissionTable)
    .values({ userId, lang })
    .onConflictDoNothing();
}

/** Used by the cron job that keeps the permission tokens table clean. */
export async function deleteExpiredLangTokens() {
  await db
    .delete(langTokenTable)
    .where(lt(langTokenTable.expiresAt, new Date()));
}
