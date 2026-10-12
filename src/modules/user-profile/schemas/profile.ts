import { z } from 'zod';

export const updateNativeLangSchema = z.object({
  nativeLang: z.string().min(1),
});

export const updateFluentLangsSchema = z.object({
  fluent: z.string().array(),
});
