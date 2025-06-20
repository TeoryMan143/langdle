import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import langRepository from '@/app/api/repositories/langs';
import { validateSessionToken } from '@/modules/auth/manager';
import {
  createLangPermissionToken,
  getUserLangPermissions,
  setUserPermission,
} from './action';

const langPermissionsRouter = new Hono();

langPermissionsRouter.get('/:userId', async c => {
  const userId = c.req.param('userId');

  const permissions = await getUserLangPermissions(userId);

  if (permissions.length === 0) {
    return c.json(
      { key: 'permissionNotFound', message: 'No permissions for that user' },
      404,
    );
  }

  return c.json(permissions);
});

langPermissionsRouter.get('/generatetoken/:lang', async c => {
  const sessionToken = getCookie(c, 'sessionToken');

  if (!sessionToken) {
    return c.json(
      {
        key: 'notSignedIn',
        message: 'Must be signed in',
      },
      401,
    );
  }

  const { user, session } = await validateSessionToken(sessionToken);

  if (!session) {
    return c.json(
      {
        key: 'notSignedIn',
        message: 'Must be signed in',
      },
      401,
    );
  }

  if (!user.admin) {
    return c.json(
      {
        key: 'notAllowed',
        message: 'Not allowed to create edit URLs',
      },
      401,
    );
  }

  const langId = c.req.param('lang');

  const languageData = await langRepository.getById(langId);

  if (!languageData) {
    return c.json(
      {
        key: 'languageNotFound',
        message: 'Language not found',
      },
      404,
    );
  }

  const token = await createLangPermissionToken(langId);

  if (!token) {
    return c.json(
      {
        key: 'tokenGenerationFailed',
        message: 'Token could not be generated',
      },
      500,
    );
  }

  return c.json({
    token,
  });
});

langPermissionsRouter.put('/set/:token', async c => {
  const sessionToken = getCookie(c, 'sessionToken');

  if (!sessionToken) {
    return c.json(
      {
        key: 'notSignedIn',
        message: 'Must be signed in',
      },
      401,
    );
  }

  const { user, session } = await validateSessionToken(sessionToken);

  if (!session) {
    return c.json(
      {
        key: 'notSignedIn',
        message: 'Must be signed in',
      },
      401,
    );
  }

  const token = c.req.param('token');

  const result = await setUserPermission(token, user.id);

  if (typeof result === 'string') {
    return c.json({ key: result, message: 'Permission could not be set' }, 400);
  }

  return c.json({ lang: result.lang });
});

export default langPermissionsRouter;
