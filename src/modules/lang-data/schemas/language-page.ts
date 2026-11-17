import { z } from 'zod';
import { languagePageSorts } from '../types';

export const LANGUAGE_PAGE_DEFAULT_SIZE = 24;
export const LANGUAGE_PAGE_MAX_SIZE = 100;

/** `?active=true|false`: the playable or the unplayable languages only. */
const activeFilterSchema = z
  .enum(['true', 'false'])
  .transform(value => value === 'true')
  .optional();

/** The query of `GET /lang/page`. */
export const languagePageQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(LANGUAGE_PAGE_MAX_SIZE)
    .default(LANGUAGE_PAGE_DEFAULT_SIZE),
  cursor: z.string().min(1).optional(),
  active: activeFilterSchema,
  sort: z.enum(languagePageSorts).default('name'),
  q: z.string().trim().max(100).optional(),
});

/**
 * What an opaque cursor holds once decoded: the sort key of the last language
 * of the previous page, `[rank, order, name, id]`.
 */
export const languageCursorSchema = z.tuple([
  z.number(),
  z.number(),
  z.string(),
  z.string().min(1),
]);
