import { Hono } from 'hono';
import { getTranslations } from 'next-intl/server';
import { authMiddleware } from '@/app/api/middleware/auth';
import { createChangeRequestSchema } from '@/modules/lang-guess/shemas';
import { uploadChangeRequest } from './action';

const featureChangeRouter = new Hono();

featureChangeRouter.post(authMiddleware, async c => {
  const t = await getTranslations();

  const changeSchema = createChangeRequestSchema(t);

  const { error, data } = changeSchema.safeParse(await c.req.json());

  if (error) {
    return c.json(
      {
        key: 'invalidData',
        message: 'An error occurred parsing the body data',
        errors: error.flatten(),
      },
      400,
    );
  }

  const user = c.get('user');

  const res = await uploadChangeRequest({ ...data, userId: user.id });

  if (!res) {
    return c.json({
      key: 'unknown',
      message: 'An error occurred',
    });
  }

  return c.json({
    result: true,
  });
});

export { featureChangeRouter };
