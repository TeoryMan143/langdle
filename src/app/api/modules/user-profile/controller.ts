import { Hono } from 'hono';
import langsRepository from '@/app/api/repositories/langs';
import { authMiddleware } from '../../middleware/auth';
import { editUserFluentLangs, editUserNativeLang, getUserData } from './action';
import { updateFluentLangsSchema, updateNativeLangSchema } from './schemas';

export const userProfileRouter = new Hono();

userProfileRouter.get('/:id', async c => {
  const id = c.req.param('id');

  const user = await getUserData(id);

  if (!user) {
    return c.json(
      {
        message: 'User not found',
      },
      404,
    );
  }

  return c.json(user);
});

userProfileRouter.put('/nativelang', authMiddleware, async c => {
  const user = c.get('user');

  const body = await c.req.json();

  const result = updateNativeLangSchema.safeParse(body);

  if (!result.success) {
    return c.json(result.error.flatten(), 400);
  }

  const lang = await langsRepository.getById(result.data.nativeLang);

  if (!lang) {
    return c.json(
      {
        message: 'The native language provided is not in our options',
      },
      404,
    );
  }

  const newUserData = await editUserNativeLang({
    userId: user.id,
    newNativeLang: lang.id,
  });

  if (!newUserData) {
    return c.json(
      {
        message: 'Unknown error updating the user',
      },
      500,
    );
  }

  return c.json({
    updated: newUserData,
  });
});

userProfileRouter.put('/fluent', authMiddleware, async c => {
  const user = c.get('user');

  const body = await c.req.json();

  const result = updateFluentLangsSchema.safeParse(body);

  if (!result.success) {
    return c.json(result.error.flatten(), 400);
  }

  const fluentIds = result.data.fluent;

  if (!fluentIds || fluentIds.length === 0) {
    await editUserFluentLangs({
      userId: user.id,
      fluentLangs: null,
    });

    return c.json({
      message: 'No ids provided, all fluents removed',
    });
  }

  try {
    langsRepository.getByIds(fluentIds);
  } catch (_) {
    return c.json(
      {
        message: 'A provided language is not in the database',
      },
      400,
    );
  }

  const newUserData = await editUserFluentLangs({
    userId: user.id,
    fluentLangs: fluentIds.join(','),
  });

  return c.json({
    updated: newUserData,
  });
});
