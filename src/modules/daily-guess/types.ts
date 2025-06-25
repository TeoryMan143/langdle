import { LanguageMatching } from '@/core/lib/types';

export type LanguageGuess = {
  id: string;
  name: string;
  exonym?: string;
  matching: LanguageMatching;
};
