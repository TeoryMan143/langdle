import { Hono } from 'hono';
import {
  apiError,
  forbidden,
  notFound,
  parseJsonBody,
  unknownError,
} from '@/core/lib/http';
import { cronMiddleware } from '@/core/middleware/cron';
import { langDataSchema } from '@/core/schemas/lang';
import { adminMiddleware, authMiddleware } from '@/modules/auth/middleware';
import { changeRequestSchema } from './schemas/change-request';
import {
  canEditLanguage,
  createChangeRequest,
  createLangPermissionToken,
  deleteExpiredLangTokens,
  getAllLanguages,
  getLanguageById,
  getLanguagesByIds,
  getRandomActiveLanguage,
  getUserLangPermissions,
  setLanguageData,
  setLanguageStatus,
  setUserPermission,
} from './service';

/* -------------------------------------------------------------------------- */
/*                             Editing permissions                            */
/* -------------------------------------------------------------------------- */

const permissionsRouter = new Hono();

permissionsRouter.get('/:userId', async c => {
  const permissions = await getUserLangPermissions(c.req.param('userId'));

  if (permissions.length === 0) {
    return apiError(
      c,
      404,
      'permissionNotFound',
      'No permissions for that user',
    );
  }

  return c.json(permissions);
});

/** Creates the token an administrator shares to grant edit rights. */
permissionsRouter.post(
  '/tokens/:lang',
  authMiddleware,
  adminMiddleware,
  async c => {
    const langId = c.req.param('lang');

    if (!(await getLanguageById(langId))) {
      return notFound(c, 'Language not found');
    }

    const token = await createLangPermissionToken(langId);

    if (!token) {
      return apiError(
        c,
        500,
        'tokenGenerationFailed',
        'Token could not be generated',
      );
    }

    return c.json({ token });
  },
);

permissionsRouter.put('/claim/:token', authMiddleware, async c => {
  const result = await setUserPermission(
    c.req.param('token'),
    c.get('user').id,
  );

  if (!result.success) {
    return apiError(c, 400, result.key, 'Permission could not be set');
  }

  return c.json({ lang: result.lang });
});

/* -------------------------------------------------------------------------- */
/*                                  Languages                                 */
/* -------------------------------------------------------------------------- */

const langDataRouter = new Hono();

langDataRouter.route('/permissions', permissionsRouter);

langDataRouter.get('/random', async c => {
  const lang = await getRandomActiveLanguage();

  if (!lang) {
    return notFound(c, 'There are no active languages');
  }

  return c.json(lang);
});

/** Suggestion sent by a user to change one feature of a language. */
langDataRouter.post('/change-requests', authMiddleware, async c => {
  const parsed = await parseJsonBody(c, changeRequestSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const created = await createChangeRequest({
    ...parsed.data,
    userId: c.get('user').id,
  });

  if (!created) {
    return unknownError(c, 'The change request could not be saved');
  }

  return c.json({ result: true }, 201);
});

langDataRouter.get('/jobs/cleanup-tokens', cronMiddleware, async c => {
  try {
    await deleteExpiredLangTokens();
    return c.json({ success: true });
  } catch (e) {
    console.error(e);
    return unknownError(c, 'Expired tokens could not be deleted');
  }
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

  if (!(await getLanguageById(langId))) {
    return notFound(c, 'Language not found');
  }

  if (!(await canEditLanguage(c.get('user'), langId))) {
    return forbidden(c, 'Language not allowed');
  }

  const parsed = await parseJsonBody(c, langDataSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  if (!(await setLanguageData(langId, parsed.data))) {
    return unknownError(c, 'The language data could not be set');
  }

  return c.json({ key: 'success', message: 'Language set' });
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
