import { type Context, Hono } from 'hono';
import { z } from 'zod';
import { FLAG_MAX_BYTES, FLAG_TYPES } from '@/core/lib/flags-config';
import {
  apiError,
  forbidden,
  notFound,
  parseJsonBody,
  unknownError,
} from '@/core/lib/http';
import { cronMiddleware } from '@/core/middleware/cron';
import { langDataBodySchema } from '@/core/schemas/lang';
import { adminMiddleware, authMiddleware } from '@/modules/auth/middleware';
import {
  changeRequestBodySchema,
  changeRequestStateSchema,
  rejectChangeRequestSchema,
} from './schemas/change-request';
import { languageRequestBodySchema } from './schemas/language-request';
import {
  canEditLanguage,
  createChangeRequest,
  createLangPermissionToken,
  createLanguageRequest,
  deleteExpiredLangTokens,
  getAllLanguages,
  getChangeRequests,
  getLanguageById,
  getLanguageRequests,
  getLanguagesByIds,
  getRandomActiveLanguage,
  getUserChangeRequests,
  getUserLangPermissions,
  getUserLanguageRequests,
  keepManagedFields,
  reviewChangeRequest,
  reviewLanguageRequest,
  setLanguageData,
  setLanguageStatus,
  setUserPermission,
} from './service';
import type {
  ChangeRequestReview,
  CreateLanguageRequestErrorKey,
  LanguageReviewErrorKey,
  ReviewErrorKey,
} from './types';

const REVIEW_ERROR_STATUS = {
  requestNotFound: 404,
  langNotFound: 404,
  requestAlreadyReviewed: 409,
  unknown: 500,
} as const satisfies Record<ReviewErrorKey, 404 | 409 | 500>;

const CREATE_LANGUAGE_ERROR_STATUS = {
  langExists: 409,
  requestPending: 409,
  invalidFlag: 400,
  unknown: 500,
} as const satisfies Record<CreateLanguageRequestErrorKey, 400 | 409 | 500>;

const LANGUAGE_REVIEW_ERROR_STATUS = {
  requestNotFound: 404,
  requestAlreadyReviewed: 409,
  langExists: 409,
  unknown: 500,
} as const satisfies Record<LanguageReviewErrorKey, 404 | 409 | 500>;

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

/* -------------------------------------------------------------------------- */
/*                               Change requests                              */
/* -------------------------------------------------------------------------- */

const changeRequestsRouter = new Hono();

/** Suggestion sent by a user to change one feature of a language. */
changeRequestsRouter.post('/', authMiddleware, async c => {
  const parsed = await parseJsonBody(c, changeRequestBodySchema);

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

/** The requests the current user made, with their state and rejection reason. */
changeRequestsRouter.get('/mine', authMiddleware, async c => {
  const requests = await getUserChangeRequests(c.get('user').id);

  if (!requests) {
    return unknownError(c, 'The change requests could not be read');
  }

  return c.json(requests);
});

/** Every request for the administrators, optionally filtered by `?state=`. */
changeRequestsRouter.get('/', authMiddleware, adminMiddleware, async c => {
  const rawState = c.req.query('state');
  const state = changeRequestStateSchema.safeParse(rawState);

  if (rawState !== undefined && !state.success) {
    return apiError(
      c,
      400,
      'invalidState',
      'The state must be pending, accepted or rejected',
    );
  }

  const requests = await getChangeRequests(state.data);

  if (!requests) {
    return unknownError(c, 'The change requests could not be read');
  }

  return c.json(requests);
});

async function reviewResponse(
  c: Context,
  ids: { request: string; reviewer: string },
  review: ChangeRequestReview,
) {
  const result = await reviewChangeRequest(ids.request, ids.reviewer, review);

  if (!result.success) {
    return apiError(
      c,
      REVIEW_ERROR_STATUS[result.key],
      result.key,
      'The change request could not be reviewed',
    );
  }

  return c.json({ request: result.request, emailSent: result.emailSent });
}

changeRequestsRouter.put('/:id/accept', authMiddleware, adminMiddleware, c =>
  reviewResponse(
    c,
    { request: c.req.param('id'), reviewer: c.get('user').id },
    { decision: 'accept' },
  ),
);

changeRequestsRouter.put(
  '/:id/reject',
  authMiddleware,
  adminMiddleware,
  async c => {
    const parsed = await parseJsonBody(c, rejectChangeRequestSchema);

    if (!parsed.success) {
      return parsed.response;
    }

    return reviewResponse(
      c,
      { request: c.req.param('id'), reviewer: c.get('user').id },
      { decision: 'reject', reason: parsed.data.reason },
    );
  },
);

langDataRouter.route('/change-requests', changeRequestsRouter);

/* -------------------------------------------------------------------------- */
/*                              Language requests                             */
/* -------------------------------------------------------------------------- */

const languageRequestsRouter = new Hono();

/**
 * A request for a language that is not in the game yet. Multipart, the only
 * non-JSON body of the API: `data` holds the JSON of the request and `flag`
 * the image (PNG, JPEG or WebP, 2 MB at most), converted to a WebP flag.
 */
languageRequestsRouter.post('/', authMiddleware, async c => {
  let form: Record<string, string | File>;

  try {
    form = (await c.req.parseBody()) as Record<string, string | File>;
  } catch (_) {
    return apiError(c, 400, 'invalidBody', 'A multipart body is required');
  }

  const { data, flag } = form;

  let json: unknown;

  try {
    json = typeof data === 'string' ? JSON.parse(data) : undefined;
  } catch (_) {
    json = undefined;
  }

  if (json === undefined) {
    return apiError(c, 400, 'invalidBody', 'The data field must be JSON');
  }

  const parsed = languageRequestBodySchema.safeParse(json);

  if (!parsed.success) {
    return apiError(
      c,
      400,
      'invalidData',
      'Invalid request data',
      z.flattenError(parsed.error),
    );
  }

  if (
    !(flag instanceof File) ||
    flag.size === 0 ||
    flag.size > FLAG_MAX_BYTES ||
    !(FLAG_TYPES as readonly string[]).includes(flag.type)
  ) {
    return apiError(
      c,
      400,
      'invalidFlag',
      'The flag must be a PNG, JPEG or WebP image of 2 MB at most',
    );
  }

  const result = await createLanguageRequest(
    c.get('user').id,
    parsed.data,
    new Uint8Array(await flag.arrayBuffer()),
  );

  if (!result.success) {
    return apiError(
      c,
      CREATE_LANGUAGE_ERROR_STATUS[result.key],
      result.key,
      'The language request could not be saved',
    );
  }

  return c.json(result.request, 201);
});

/** The language requests the current user made. */
languageRequestsRouter.get('/mine', authMiddleware, async c => {
  const requests = await getUserLanguageRequests(c.get('user').id);

  if (!requests) {
    return unknownError(c, 'The language requests could not be read');
  }

  return c.json(requests);
});

/** Every language request for the administrators, optionally by `?state=`. */
languageRequestsRouter.get('/', authMiddleware, adminMiddleware, async c => {
  const rawState = c.req.query('state');
  const state = changeRequestStateSchema.safeParse(rawState);

  if (rawState !== undefined && !state.success) {
    return apiError(
      c,
      400,
      'invalidState',
      'The state must be pending, accepted or rejected',
    );
  }

  const requests = await getLanguageRequests(state.data);

  if (!requests) {
    return unknownError(c, 'The language requests could not be read');
  }

  return c.json(requests);
});

async function languageReviewResponse(
  c: Context,
  ids: { request: string; reviewer: string },
  review: ChangeRequestReview,
) {
  const result = await reviewLanguageRequest(ids.request, ids.reviewer, review);

  if (!result.success) {
    return apiError(
      c,
      LANGUAGE_REVIEW_ERROR_STATUS[result.key],
      result.key,
      'The language request could not be reviewed',
    );
  }

  return c.json({ request: result.request, emailSent: result.emailSent });
}

languageRequestsRouter.put('/:id/accept', authMiddleware, adminMiddleware, c =>
  languageReviewResponse(
    c,
    { request: c.req.param('id'), reviewer: c.get('user').id },
    { decision: 'accept' },
  ),
);

languageRequestsRouter.put(
  '/:id/reject',
  authMiddleware,
  adminMiddleware,
  async c => {
    const parsed = await parseJsonBody(c, rejectChangeRequestSchema);

    if (!parsed.success) {
      return parsed.response;
    }

    return languageReviewResponse(
      c,
      { request: c.req.param('id'), reviewer: c.get('user').id },
      { decision: 'reject', reason: parsed.data.reason },
    );
  },
);

langDataRouter.route('/language-requests', languageRequestsRouter);

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
