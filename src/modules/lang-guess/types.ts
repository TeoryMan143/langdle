import type { InferSelectModel } from 'drizzle-orm';
import type { z } from 'zod';
import type { gameHistoryTable } from '@/core/database/relational/tables';
import type { LangFeatures, Language } from '@/core/types';
import type { guessHistoryReqSchema } from './schemas/guess-history';

/** How the features of a guess compare with the ones of the target language. */
export type LanguageMatching = {
  correct: LangFeatures[];
  incorrect: LangFeatures[];
  partial: LangFeatures[];
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
