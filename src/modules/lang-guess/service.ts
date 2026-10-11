import { desc, eq } from 'drizzle-orm';
import {
  getStringByKey,
  setStringToKey,
} from '@/core/database/redis/key-getters';
import { db } from '@/core/database/relational/config';
import { gameHistoryTable } from '@/core/database/relational/tables';
import type { LangFeatures, Language } from '@/core/types';
import {
  getLanguageById,
  getRandomActiveLanguage,
} from '@/modules/lang-data/service';
import type { GuessHistoryReq, LanguageMatching } from './types';

const DAILY_LANG_KEY = 'daylang';

/* -------------------------------------------------------------------------- */
/*                               Daily language                               */
/* -------------------------------------------------------------------------- */

export async function getDailyLang() {
  const daily = await getStringByKey(DAILY_LANG_KEY);

  if (!daily) {
    throw new Error('daily lang not defined');
  }

  const lang = await getLanguageById(daily);

  if (!lang) {
    throw new Error('daily lang not defined');
  }

  return lang;
}

/** Called by the cron job that rolls the language of the day. */
export async function rollDailyLang() {
  const lang = await getRandomActiveLanguage();

  if (!lang) {
    throw new Error('there are no active languages to pick from');
  }

  await setStringToKey(DAILY_LANG_KEY, lang.id);

  return lang;
}

/**
 * Resolves the language a guess is compared against: the daily one by default,
 * any language when playing a random game.
 */
export function getTargetLang(targetId?: string | null) {
  return !targetId || targetId === 'daily'
    ? getDailyLang()
    : getLanguageById(targetId);
}

/* -------------------------------------------------------------------------- */
/*                                  Matching                                  */
/* -------------------------------------------------------------------------- */

export function getMatching(
  guessedLang: Language,
  targetLang: Language,
): LanguageMatching {
  const guessFeatures = new Set(guessedLang.features as LangFeatures[]);
  const guessPartial = new Set(guessedLang.partial as LangFeatures[]);
  const targetFeatures = new Set(targetLang.features as LangFeatures[]);
  const targetPartial = new Set(targetLang.partial as LangFeatures[]);

  const guessed = guessFeatures.union(guessPartial);

  return {
    correct: [...targetFeatures.intersection(guessed)],
    incorrect: [...guessed.difference(targetFeatures.union(targetPartial))],
    partial: [...targetPartial.intersection(guessed)],
  };
}

/* -------------------------------------------------------------------------- */
/*                                Game history                               */
/* -------------------------------------------------------------------------- */

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
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function getGuessesHistory(userId: string) {
  try {
    return await db
      .select()
      .from(gameHistoryTable)
      .where(eq(gameHistoryTable.userId, userId))
      .orderBy(desc(gameHistoryTable.date));
  } catch (e) {
    console.error(e);
    return null;
  }
}
