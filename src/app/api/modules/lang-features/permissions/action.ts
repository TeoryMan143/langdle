import { db } from '@/core/database/relational/config';
import { langPermissionTable } from '@/core/database/relational/tables';
import { eq } from 'drizzle-orm';

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
