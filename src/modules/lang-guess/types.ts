import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  changeRequestTable,
  gameHistoryTable,
} from '@/core/database/relational/tables';
import { LanguageMatching } from '@/core/lib/types';

export type LanguageGuess = {
  id: string;
  name: string;
  exonym?: string;
  matching: LanguageMatching;
};

export type GameHistory = InferSelectModel<typeof gameHistoryTable>;
export type FeatureChangeRequest = InferInsertModel<typeof changeRequestTable>;
