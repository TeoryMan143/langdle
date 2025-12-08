import { eq } from 'drizzle-orm';
import { db } from '@/core/database/relational/config';
import { userTable } from '@/core/database/relational/tables';
import { UserDTO } from '@/modules/auth/types';

const { password: _, ...userTableWithoutPassword } = userTable;

export async function getUserData(userId: string): Promise<UserDTO | null> {
  try {
    const [result] = await db
      .select({ user: userTableWithoutPassword })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    return result.user;
  } catch (_) {
    return null;
  }
}

export async function editUserNativeLang({
  userId,
  newNativeLang,
}: {
  userId: string;
  newNativeLang: string;
}) {
  try {
    const [newUser] = await db
      .update(userTable)
      .set({ nativeLanguage: newNativeLang })
      .where(eq(userTable.id, userId))
      .returning();

    return newUser;
  } catch (_) {
    return null;
  }
}

export async function editUserFluentLangs({
  userId,
  fluentLangs,
}: {
  userId: string;
  fluentLangs: string | null;
}) {
  try {
    const [newUser] = await db
      .update(userTable)
      .set({ fluent: fluentLangs })
      .where(eq(userTable.id, userId))
      .returning();

    return newUser;
  } catch (_) {
    return null;
  }
}
