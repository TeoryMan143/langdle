import { z } from 'zod';

export const updateNativeLangSchema = z.object({
  nativeLang: z.string(),
});

export const updateFluentLangsSchema = z.object({
  fluent: z.string().transform(langIds => langIds.split(',')),
});
