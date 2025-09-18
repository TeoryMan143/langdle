import { Hono } from 'hono';
import langRepository from '@/app/api/repositories/langs';
import { langDataSchema } from '@/core/lib/schemas/langs';
import { getRandomInt } from '@/core/lib/utils';
import { authMiddleware } from '../../middleware/auth';
import {
  getAllLanguages,
  getLanguageById,
  getLanguagesByIds,
  setLanguageData,
} from './action';
import { getUserLangPermissions } from './permissions/action';
import langPermissions from './permissions/controller';

const langFeaturesRouter = new Hono();

langFeaturesRouter.get('/random', async c => {
  const langs = await langRepository.getAll(true);

  const randomLang = langs[getRandomInt(0, langs.length - 1)];

  return c.json(randomLang);
});

langFeaturesRouter.get('/:id', async c => {
  const langId = c.req.param('id');

  const lang = await getLanguageById(langId);

  if (!lang) {
    return c.json(
      {
        key: 'notFound',
        message: 'Language not found',
      },
      404,
    );
  }

  return c.json(lang);
});

langFeaturesRouter.get('/', async c => {
  const sParams = new URL(c.req.url).searchParams;

  const langIds = sParams.getAll('id');
  const onlyActive = sParams.get('oactive') === '1';

  const langs =
    langIds.length === 0
      ? await getAllLanguages(onlyActive)
      : await getLanguagesByIds(langIds);

  if (!langs || langs.length === 0) {
    return c.json(
      {
        key: 'notFounds',
        message: 'No languages found',
      },
      404,
    );
  }

  return c.json(langs);
});

langFeaturesRouter.put('/:id', authMiddleware, async c => {
  const langId = c.req.param('id');

  const lang = await getLanguageById(langId);

  if (!lang) {
    return c.json(
      {
        key: 'notFound',
        message: 'Error invalid language code',
      },
      400,
    );
  }

  const user = c.get('user');

  const permissions = await getUserLangPermissions(user.id);

  if (!permissions.includes(langId) && !user.admin) {
    return c.json(
      {
        key: 'notAllowed',
        message: 'Language not allowed',
      },
      401,
    );
  }

  const body = await c.req.json();

  const { error: dataError, data: langData } = langDataSchema.safeParse(body);

  if (dataError) {
    return c.json(
      {
        key: 'invalidData',
        message: 'An error occurred parsing the body data',
        errors: dataError.flatten(),
      },
      400,
    );
  }

  const success = await setLanguageData({ id: langId, data: langData });

  if (!success) {
    return c.json(
      {
        key: 'unknown',
        message: 'Unknown error, the language data could not be set',
      },
      500,
    );
  }

  return c.json({
    key: 'success',
    message: 'Language set',
  });
});

langFeaturesRouter.put('/:id/status', authMiddleware, async c => {
  const active = new URL(c.req.url).searchParams.get('active');

  if (!active) {
    return c.json({
      key: 'notActive',
      message: 'You need the active param',
    });
  }

  const user = c.get('user');

  if (!user.admin) {
    return c.json(
      {
        key: 'noAdmin',
        message: 'You need to be an administrator',
      },
      401,
    );
  }

  const id = c.req.param('id');

  const lang = await getLanguageById(id);

  if (!lang) {
    return c.json(
      {
        key: 'noLang',
        message: 'Language not found',
      },
      404,
    );
  }

  const statusRes = await langRepository.setStatus(id, active === 'true');

  if (!statusRes) {
    return c.json(
      {
        key: 'statusChange',
        message: 'Unknown error chaging language status',
      },
      500,
    );
  }

  return c.json({
    success: true,
  });
});

langFeaturesRouter.route('/permissions', langPermissions);

export default langFeaturesRouter;
