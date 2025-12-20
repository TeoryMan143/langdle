import { desc, eq } from 'drizzle-orm';
import { db } from '@/core/database/relational/config';
import { gameHistoryTable } from '@/core/database/relational/tables';
import { type GuessHistoryReq } from './schemas';

export async function addGuessesHistory(
  userId: string,
  historyData: GuessHistoryReq,
) {
  try {
    const [gameHistory] = await db
      .insert(gameHistoryTable)
      .values({ userId, ...historyData })
      .returning();

    return gameHistory;
  } catch (_) {
    return null;
  }
}

export async function getGuessesHistory(userId: string) {
  try {
    const history = await db
      .select()
      .from(gameHistoryTable)
      .where(eq(gameHistoryTable.userId, userId))
      .orderBy(desc(gameHistoryTable.date));
    return history;
  } catch (_) {
    console.log('sisas');
    return null;
  }
}
