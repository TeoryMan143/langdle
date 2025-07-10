import { createMiddleware } from 'hono/factory';
import { validateSessionToken } from '@/modules/auth/manager';
import { Session, UserDTO } from '@/modules/auth/types';

export const authMiddleware = createMiddleware<{
  Variables: {
    session: Session;
    user: UserDTO;
  };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      {
        key: 'notSignedIn',
        message: 'Must be signed in',
      },
      401,
    );
  }

  const sessionToken = authHeader.split(' ')[1];

  if (!sessionToken) {
    return c.json(
      {
        key: 'notSignedIn',
        message: 'Must be signed in',
      },
      401,
    );
  }

  const { session, user } = await validateSessionToken(sessionToken);

  if (!session || !user) {
    return c.json(
      {
        key: 'notSignedIn',
        message: 'Must be signed in',
      },
      401,
    );
  }

  c.set('session', session);
  c.set('user', user);

  await next();
});
