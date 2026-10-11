import { createMiddleware } from 'hono/factory';
import { apiError } from '@/core/lib/http';
import { validateSessionToken } from './service';
import type { Session, UserDTO } from './types';

type AuthEnv = {
  Variables: {
    session: Session;
    user: UserDTO;
  };
};

/**
 * Requires a `Bearer <sessionToken>` header and exposes `session`/`user` to the
 * handlers through the hono context.
 */
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  const sessionToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined;

  if (!sessionToken) {
    return apiError(c, 401, 'notSignedIn', 'Must be signed in');
  }

  const { session, user } = await validateSessionToken(sessionToken);

  if (!session || !user) {
    return apiError(c, 401, 'notSignedIn', 'Must be signed in');
  }

  c.set('session', session);
  c.set('user', user);

  await next();
});

/** Runs after `authMiddleware` and rejects non administrator users. */
export const adminMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  if (!c.get('user').admin) {
    return apiError(c, 403, 'noAdmin', 'You need to be an administrator');
  }

  await next();
});
