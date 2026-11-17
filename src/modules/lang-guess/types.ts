import type { InferSelectModel } from 'drizzle-orm';
import type { z } from 'zod';
import type { gameHistoryTable } from '@/core/database/relational/tables';
import type { LangFeatures, Language } from '@/core/types';
import type { guessHistoryReqSchema } from './schemas/guess-history';

/**
 * How a guess is related to the target: same branch (genus), same family
 * only, or another family.
 */
export const guessRelations = ['genus', 'family', 'none'] as const;

export type GuessRelation = (typeof guessRelations)[number];

/**
 * Clues from where the two languages are spoken and how they are related.
 * Each one is left out when either language lacks the data behind it.
 */
export type GuessHints = {
  /** Great-circle distance from the guess to the target, in km. */
  distanceKm?: number;
  /** Direction from the guess towards the target, degrees clockwise from north. */
  bearing?: number;
  relation?: GuessRelation;
};

/** How the features of a guess compare with the ones of the target language. */
export type LanguageMatching = {
  correct: LangFeatures[];
  incorrect: LangFeatures[];
  partial: LangFeatures[];
  hints?: GuessHints;
};

export type LanguageGuess = {
  id: string;
  name: string;
  exonym?: string;
  matching: LanguageMatching;
};

export type GameHistory = InferSelectModel<typeof gameHistoryTable>;

export type GuessHistoryReq = z.infer<typeof guessHistoryReqSchema>;

/** `GET /api/guess/:id` answers the target itself when the guess is right. */
export type GuessResult = { guessed: Language } | LanguageMatching;
