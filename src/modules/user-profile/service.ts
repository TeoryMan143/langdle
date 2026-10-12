import { eq } from 'drizzle-orm';
import { db } from '@/core/database/relational/config';
import { userTable } from '@/core/database/relational/tables';
import type { UserDTO } from '@/modules/auth/types';

const { password: _password, ...userTableWithoutPassword } = userTable;

export async function getUserProfile(userId: string): Promise<UserDTO | null> {
  try {
    const [result] = await db
      .select({ user: userTableWithoutPassword })
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
