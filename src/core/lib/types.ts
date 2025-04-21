import { z } from 'zod';
import { languageCodes, langFeatures } from './utils';
import { langDataSchema } from './schemas/langs';

export type LangFeatures = (typeof langFeatures)[number];
export type LanguageCode = (typeof languageCodes)[number];
export type LanguageData = z.TypeOf<typeof langDataSchema>;
export type Language = { id: LanguageCode } & LanguageData;
