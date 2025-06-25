import { z } from 'zod';
import { langDataSchema } from './schemas/langs';
import { langFeatures } from './utils';

export type LangFeatures = (typeof langFeatures)[number];
export type LanguageData = z.TypeOf<typeof langDataSchema>;
export type Language = { id: string } & LanguageData;
export type LanguageMatching = {
  correct: LangFeatures[];
  incorrect: LangFeatures[];
};
