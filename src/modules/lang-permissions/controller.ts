import { Hono } from 'hono';
import { apiError, notFound, unknownError } from '@/core/lib/http';
import { cronMiddleware } from '@/core/middleware/cron';
import { adminMiddleware, authMiddleware } from '@/modules/auth/middleware';
import { getLanguageById } from '@/modules/lang-data/service';
import {
  createLangPermissionToken,
  deleteExpiredLangTokens,
  getUserLangPermissions,
  setUserPermission,
} from './service';

/** Mounted at `/api/lang/permissions`. */
const langPermissionsRouter = new Hono();

langPermissionsRouter.get('/:userId', async c => {
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
langPermissionsRouter.post(
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

langPermissionsRouter.put('/claim/:token', authMiddleware, async c => {
  const result = await setUserPermission(
    c.req.param('token'),
    c.get('user').id,
  );

  if (!result.success) {
    return apiError(c, 400, result.key, 'Permission could not be set');
  }

  return c.json({ lang: result.lang });
});

/**
 * Mounted at `/api/lang/jobs`: the cron path predates this module and is
 * registered in `vercel.json`, so it keeps its place.
 */
export const langPermissionsJobsRouter = new Hono();

langPermissionsJobsRouter.get('/cleanup-tokens', cronMiddleware, async c => {
  try {
    await deleteExpiredLangTokens();
    return c.json({ success: true });
  } catch (e) {
    console.error(e);
    return unknownError(c, 'Expired tokens could not be deleted');
  }
});

export default langPermissionsRouter;
