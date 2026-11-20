import { type Context, Hono } from 'hono';
import { z } from 'zod';
import { FLAG_MAX_BYTES, FLAG_TYPES } from '@/core/lib/flags-config';
import { apiError, parseJsonBody, unknownError } from '@/core/lib/http';
import { adminMiddleware, authMiddleware } from '@/modules/auth/middleware';
import {
  changeRequestBodySchema,
  changeRequestStateSchema,
  rejectChangeRequestSchema,
} from './schemas/change-request';
import { languageRequestBodySchema } from './schemas/language-request';
import {
  createChangeRequest,
  createLanguageRequest,
  getChangeRequests,
  getLanguageRequests,
  getUserChangeRequests,
  getUserLanguageRequests,
  reviewChangeRequest,
  reviewLanguageRequest,
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
/*                               Change requests                              */
/* -------------------------------------------------------------------------- */

/** Mounted at `/api/lang/change-requests`. */
export const changeRequestsRouter = new Hono();

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

/* -------------------------------------------------------------------------- */
/*                              Language requests                             */
/* -------------------------------------------------------------------------- */

/** Mounted at `/api/lang/language-requests`. */
export const languageRequestsRouter = new Hono();

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
