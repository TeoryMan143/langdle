import { z } from 'zod';
import { langFeatures } from './utils';
import { langDataSchema } from './schemas/langs';

export type LangFeatures = (typeof langFeatures)[number];
export type LanguageData = z.TypeOf<typeof langDataSchema>;
export type Language = { id: string } & LanguageData;
