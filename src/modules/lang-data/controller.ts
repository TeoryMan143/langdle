import { Hono } from 'hono';
import {
  apiError,
  forbidden,
  notFound,
  parseJsonBody,
  unknownError,
} from '@/core/lib/http';
import { langDataBodySchema } from '@/core/schemas/lang';
import { adminMiddleware, authMiddleware } from '@/modules/auth/middleware';
import { canEditLanguage } from '@/modules/lang-permissions/service';
import {
  languageNamesQuerySchema,
  languagePageQuerySchema,
} from './schemas/language-page';
import {
  getAllLanguages,
  getLanguageById,
  getLanguageNames,
  getLanguagesByIds,
  getLanguagesPage,
  getLanguagesSummary,
  getRandomActiveLanguage,
  keepManagedFields,
  setLanguageData,
  setLanguageStatus,
} from './service';

/**
 * Mounted at `/api/lang`, after the permissions, change requests and language
 * requests routers: `/:id` would match their prefixes otherwise.
 */
const langDataRouter = new Hono();

langDataRouter.get('/random', async c => {
  const lang = await getRandomActiveLanguage();

  if (!lang) {
    return notFound(c, 'There are no active languages');
  }

  return c.json(lang);
});

/**
 * The catalogue one batch at a time: `?limit=` (1–100, default 24), the
 * `nextCursor` of the previous batch as `?cursor=`, `?active=true|false` to
 * keep the playable or the unplayable languages, `?sort=name|coverage` and
 * `?q=` to keep the languages matching it, best matches first.
 */
langDataRouter.get('/page', async c => {
  const parsed = languagePageQuerySchema.safeParse(c.req.query());

  if (!parsed.success) {
    return apiError(
      c,
      400,
      'invalidData',
      'Invalid paging query',
      parsed.error.flatten(),
    );
  }

  const { q, ...options } = parsed.data;
  const result = await getLanguagesPage({ ...options, query: q });

  if (!result.success) {
    return result.key === 'invalidCursor'
      ? apiError(c, 400, 'invalidCursor', 'The cursor is not valid')
      : unknownError(c, 'The languages could not be read');
  }

  return c.json(result.page);
});

/**
 * The names of every language (`?active=true|false` for one part), by name:
 * light enough for a picker to load once and search in the browser.
 */
langDataRouter.get('/names', async c => {
  const parsed = languageNamesQuerySchema.safeParse(c.req.query());

  if (!parsed.success) {
    return apiError(
      c,
      400,
      'invalidData',
      'Invalid names query',
      parsed.error.flatten(),
    );
  }

  const names = await getLanguageNames(parsed.data.active);

  if (!names) {
    return unknownError(c, 'The languages could not be read');
  }

  return c.json(names);
});

/** How many languages and features the catalogue holds. */
langDataRouter.get('/summary', async c => {
  const summary = await getLanguagesSummary();

  if (!summary) {
    return unknownError(c, 'The summary could not be computed');
  }

  return c.json(summary);
});

langDataRouter.get('/', async c => {
  const langIds = c.req.queries('id') ?? [];
  const onlyActive = c.req.query('oactive') === '1';

  const langs =
    langIds.length === 0
      ? await getAllLanguages(onlyActive)
      : await getLanguagesByIds(langIds);

  if (langs.length === 0) {
    return apiError(c, 404, 'notFounds', 'No languages found');
  }

  return c.json(langs);
});

langDataRouter.get('/:id', async c => {
  const lang = await getLanguageById(c.req.param('id'));

  if (!lang) {
    return notFound(c, 'Language not found');
  }

  return c.json(lang);
});

langDataRouter.put('/:id', authMiddleware, async c => {
  const langId = c.req.param('id');
  const stored = await getLanguageById(langId);

  if (!stored) {
    return notFound(c, 'Language not found');
  }

  if (!(await canEditLanguage(c.get('user'), langId))) {
    return forbidden(c, 'Language not allowed');
  }

  const parsed = await parseJsonBody(c, langDataBodySchema);

  if (!parsed.success) {
    return parsed.response;
  }

  if (
    !(await setLanguageData(langId, keepManagedFields(stored, parsed.data)))
  ) {
    return unknownError(c, 'The language data could not be set');
  }

  // `key` and `message` predate `language` and stay for installed apps.
  return c.json({
    key: 'success',
    message: 'Language set',
    language: await getLanguageById(langId),
  });
});

langDataRouter.put('/:id/status', authMiddleware, adminMiddleware, async c => {
  const active = c.req.query('active');

  if (active !== 'true' && active !== 'false') {
    return apiError(
      c,
      400,
      'notActive',
      'The active param must be true or false',
    );
  }

  const langId = c.req.param('id');

  if (!(await getLanguageById(langId))) {
    return notFound(c, 'Language not found');
  }

  if (!(await setLanguageStatus(langId, active === 'true'))) {
    return unknownError(c, 'The language status could not be changed');
  }

  return c.json({ success: true, lang: langId });
});

export default langDataRouter;
