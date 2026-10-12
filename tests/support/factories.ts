import { getClient } from '@/core/database/redis/config';
import { db } from '@/core/database/relational/config';
import {
  changeRequestTable,
  gameHistoryTable,
  langPermissionTable,
  userTable,
} from '@/core/database/relational/tables';
import type { LanguageData } from '@/core/types';
import {
  createSession,
  generateSessionToken,
  hashPassword,
} from '@/modules/auth/service';

export const PASSWORD = 'correct-horse-battery';

// argon2 is slow on purpose: hash once and share it between users.
let passwordHash: Promise<string> | undefined;

let sequence = 0;

/** A user straight in the database, with a live session token. */
export async function createTestUser(
  overrides: Partial<typeof userTable.$inferInsert> = {},
) {
  sequence += 1;
  passwordHash ??= hashPassword(PASSWORD);

  const [user] = await db
    .insert(userTable)
    .values({
      nickname: `user${sequence}`,
      email: `user${sequence}@langdle.test`,
      country: 'ES',
      password: await passwordHash,
      ...overrides,
    })
    .returning();

  const token = generateSessionToken();
  const session = await createSession(token, user.id);

  return { user, token, session };
}

export const createTestAdmin = (
  overrides: Partial<typeof userTable.$inferInsert> = {},
) => createTestUser({ admin: true, ...overrides });

/** Stores a language the way the catalogue does: a JSON document at `lang:<id>`. */
export async function seedLanguage(
  id: string,
  overrides: Partial<LanguageData> = {},
) {
  const data: LanguageData = {
    name: id,
    exonym: id,
    active: true,
    features: [],
    partial: [],
    searchParams: [],
    ...overrides,
  };

  const client = await getClient();
  await client.json.set(`lang:${id}`, '$', data);

  return { id, ...data };
}

export async function getStoredLanguage(id: string) {
  const client = await getClient();
  return (await client.json.get(`lang:${id}`)) as LanguageData | null;
}

export async function grantPermission(userId: string, lang: string) {
  await db.insert(langPermissionTable).values({ userId, lang });
}

export async function seedChangeRequest(
  overrides: Partial<typeof changeRequestTable.$inferInsert> &
    Pick<typeof changeRequestTable.$inferInsert, 'userId'>,
) {
  const [request] = await db
    .insert(changeRequestTable)
    .values({
      lang: 'spanish',
      feature: 'tones',
      status: 'present',
      description: 'Spanish does have tones',
      ...overrides,
    })
    .returning();

  return request;
}

export async function seedHistory(
  userId: string,
  overrides: Partial<typeof gameHistoryTable.$inferInsert> = {},
) {
  const [game] = await db
    .insert(gameHistoryTable)
    .values({
      userId,
      type: 'daily',
      targetLang: 'spanish',
      guesses: 3,
      guessed: true,
      ...overrides,
    })
    .returning();

  return game;
}
