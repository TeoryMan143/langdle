import { z } from 'zod';

export const LANGUAGE_PAGE_DEFAULT_SIZE = 24;
export const LANGUAGE_PAGE_MAX_SIZE = 100;

/** The query of `GET /lang/page`. */
export const languagePageQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(LANGUAGE_PAGE_MAX_SIZE)
    .default(LANGUAGE_PAGE_DEFAULT_SIZE),
  cursor: z.string().min(1).optional(),
  oactive: z.literal('1').optional(),
  q: z.string().trim().max(100).optional(),
});

/**
 * What an opaque cursor holds once decoded: the sort key of the last language
 * of the previous page, `[name, id]`.
 */
export const languageCursorSchema = z.tuple([z.string(), z.string().min(1)]);
