import { eq } from 'drizzle-orm';
import { db } from '@/core/database/relational/config';
import { userTable } from '@/core/database/relational/tables';
import { evictUserSessionsCache } from '@/modules/auth/service';
import type { UserDTO } from '@/modules/auth/types';
import type { PublicProfile } from './types';

const publicProfileColumns = {
  id: userTable.id,
  nickname: userTable.nickname,
  country: userTable.country,
  admin: userTable.admin,
  nativeLanguage: userTable.nativeLanguage,
  fluent: userTable.fluent,
};

export async function getUserProfile(
  userId: string,
): Promise<PublicProfile | null> {
  try {
    const [result] = await db
      .select({ user: publicProfileColumns })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    return result?.user ?? null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function updateProfile(userId: string, values: Partial<UserDTO>) {
  try {
    const [newUser] = await db
      .update(userTable)
      .set(values)
      .where(eq(userTable.id, userId))
      .returning();

    if (!newUser) {
      return null;
    }

    await evictUserSessionsCache(userId);

    const { password: _, ...userWithoutPassword } = newUser;

    return userWithoutPassword;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export function setNativeLanguage(userId: string, nativeLanguage: string) {
  return updateProfile(userId, { nativeLanguage });
}

/** The fluent languages are stored as a comma separated list of ids. */
export function setFluentLanguages(userId: string, langIds: string[]) {
  return updateProfile(userId, {
    fluent: langIds.length === 0 ? null : langIds.join(','),
  });
}
