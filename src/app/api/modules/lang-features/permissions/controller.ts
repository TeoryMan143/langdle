import { Hono } from 'hono';
import { getUserLangPermissions } from './action';

const langPermissions = new Hono();

langPermissions.get('/:userId', async c => {
  const userId = c.req.param('userId');

  const permissions = await getUserLangPermissions(userId);

  if (permissions.length === 0) {
    return c.json({ message: 'No permissions for that user' }, 404);
  }

  return c.json(permissions);
});

export default langPermissions;
