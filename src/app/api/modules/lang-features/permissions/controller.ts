import { Hono } from 'hono';
import {
  createLangPermissionToken,
  getUserLangPermissions,
  setUserPermission,
} from './action';
import langRepository from '@/app/api/repositories/langs';
import { getCookie } from 'hono/cookie';
import { validateSessionToken } from '@/modules/auth/manager';

const langPermissionsRouter = new Hono();

langPermissionsRouter.get('/:userId', async c => {
  const userId = c.req.param('userId');

  const permissions = await getUserLangPermissions(userId);

  if (permissions.length === 0) {
    return c.json({ message: 'No permissions for that user' }, 404);
  }

  return c.json(permissions);
});

langPermissionsRouter.get('/generatetoken/:lang', async c => {
  const sessionToken = getCookie(c, 'sessionToken');

  if (!sessionToken) {
    return c.json(
      {
        message: 'Must be signed in',
      },
      401,
    );
  }

  const { user, session } = await validateSessionToken(sessionToken);

  if (!session) {
    return c.json(
      {
        message: 'Must be signed in',
      },
      401,
    );
  }

  if (!user.admin) {
    return c.json(
      {
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
        message: 'Language not found',
      },
      404,
    );
  }

  const token = await createLangPermissionToken(langId);

  if (!token) {
    return c.json(
      {
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
        message: 'Must be signed in',
      },
      401,
    );
  }

  const { user, session } = await validateSessionToken(sessionToken);

  if (!session) {
    return c.json(
      {
        message: 'Must be signed in',
      },
      401,
    );
  }

  const token = c.req.param('token');

  const message = await setUserPermission(token, user.id);

  if (typeof message === 'string') {
    return c.json({ message }, 400);
  }

  return c.json({ lang: message.lang });
});

export default langPermissionsRouter;
