import { desc, eq } from 'drizzle-orm';
import {
  getStringByKey,
  setStringToKey,
} from '@/core/database/redis/key-getters';
import { db } from '@/core/database/relational/config';
import { gameHistoryTable } from '@/core/database/relational/tables';
import type { LangFeatures, LangLocation, Language } from '@/core/types';
import {
  getLanguageById,
  getRandomActiveLanguage,
} from '@/modules/lang-data/service';
import type {
  GuessHints,
  GuessHistoryReq,
  GuessRelation,
  LanguageMatching,
} from './types';

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
/*                                    Hints                                   */
/* -------------------------------------------------------------------------- */

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

type Location = LangLocation;

/** Haversine distance, in km. */
export function distanceKm(from: Location, to: Location) {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial bearing of the great circle from `from` to `to`, 0–360°. */
export function bearing(from: Location, to: Location) {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const dLng = toRadians(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * The nearest point of the guess and the nearest point of the target to each
 * other: Portuguese (Portugal, Brazil) is close to Spanish (Spain, the
 * Americas) through Portugal and Spain.
 */
export function closestPair(
  from: Location[] = [],
  to: Location[] = [],
): [Location, Location] | undefined {
  let best: [Location, Location] | undefined;
  let bestKm = Number.POSITIVE_INFINITY;

  for (const a of from) {
    for (const b of to) {
      const km = distanceKm(a, b);
      if (km < bestKm) {
        bestKm = km;
        best = [a, b];
      }
    }
  }

  return best;
}

function relation(
  guess: Language,
  target: Language,
): GuessRelation | undefined {
  if (!guess.family || !target.family) {
    return undefined;
  }

  if (guess.family !== target.family) {
    return 'none';
  }

  return guess.genus && guess.genus === target.genus ? 'genus' : 'family';
}

/** The clues a wrong guess earns, besides its feature matching. */
export function getHints(guess: Language, target: Language): GuessHints {
  const hints: GuessHints = {};

  const pair = closestPair(guess.locations, target.locations);

  if (pair) {
    const [from, to] = pair;
    hints.distanceKm = Math.round(distanceKm(from, to));

    // Two languages spoken at the same point have no direction to point at.
    if (hints.distanceKm > 0) {
      hints.bearing = Math.round(bearing(from, to)) % 360;
    }
  }

  const related = relation(guess, target);

  if (related) {
    hints.relation = related;
  }

  return hints;
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
