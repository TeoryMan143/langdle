import { db } from '@/core/database/relational/config';
import {
  langPermissionTable,
  langTokenTable,
  userTable,
} from '@/core/database/relational/tables';
import { sha256 } from '@oslojs/crypto/sha2';
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from '@oslojs/encoding';
import { eq } from 'drizzle-orm';
import * as jose from 'jose';
import { JWTExpired } from 'jose/errors';

export async function getUserLangPermissions(userId: string) {
  try {
    const permissions = await db
      .select({
        lang: langPermissionTable.lang,
      })
      .from(langPermissionTable)
      .where(eq(langPermissionTable.userId, userId));

    return permissions.map(permission => permission.lang);
  } catch (error) {
    console.error('Error fetching user lang permissions:', error);
    return [];
  }
}

export async function createLangPermissionToken(lang: string) {
  try {
    const secret = jose.base64url.decode(process.env.JWT_SECRET as string);

    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const code = encodeBase32LowerCaseNoPadding(bytes);

    const jwt = await new jose.EncryptJWT({ lang, code })
      .setExpirationTime('10m')
      .setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
      .encrypt(secret);

    const encoded = encodeHexLowerCase(sha256(new TextEncoder().encode(code)));

    await db.insert(langTokenTable).values({ lang, code: encoded });

    return jwt;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function setUserPermission(jwt: string, userId: string) {
  try {
    const user = await db.query.userTable.findFirst({
      where: eq(userTable.id, userId),
    });

    if (!user) {
      return 'userNotFound';
    }

    if (user.admin) {
      return 'userIsAdmin';
    }

    const secret = jose.base64url.decode(process.env.JWT_SECRET as string);

    const { payload } = await jose.jwtDecrypt<{ lang: string; code: string }>(
      jwt,
      secret,
    );

    const encoded = encodeHexLowerCase(
      sha256(new TextEncoder().encode(payload.code)),
    );

    const langToken = await db.query.langTokenTable.findFirst({
      where: eq(langTokenTable.code, encoded),
    });

    if (!langToken) {
      return 'tokenNotFound';
    }

    const lang = langToken.lang;

    const permission = await db.query.langPermissionTable.findFirst({
      where: eq(langPermissionTable.lang, lang),
    });

    if (permission) {
      await db.delete(langTokenTable).where(eq(langTokenTable.code, encoded));
      return 'userHasPermission';
    }

    await db.insert(langPermissionTable).values({ userId, lang });
    await db.delete(langTokenTable).where(eq(langTokenTable.code, encoded));

    return { lang };
  } catch (error) {
    console.error(error);

    if (error instanceof JWTExpired) {
      return 'tokenExpired';
    }

    return 'unknown';
  }
}
