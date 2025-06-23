import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { langDataSchema } from '@/core/lib/schemas/langs';
import { validateSessionToken } from '@/modules/auth/manager';
import {
  getAllLanguages,
  getLangSearch,
  getLanguageById,
  getLanguagesByIds,
  setLanguageData,
} from './action';
import { getUserLangPermissions } from './permissions/action';
import langPermissions from './permissions/controller';

const langFeaturesRouter = new Hono();

langFeaturesRouter.get('/search', async c => {
  const q = new URL(c.req.url).searchParams.get('q');

  if (!q || q.length < 2) {
    return c.json(
      {
        key: 'invalidQuery',
        message: 'Query must be at least 2 characters long',
      },
      400,
    );
  }

  const langs = await getLangSearch(q);

  if (!langs) {
    return c.json({
      key: 'notFounds',
      message: 'No languages found',
    });
  }

  return c.json(langs);
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
  const langIds = new URL(c.req.url).searchParams.getAll('id');

  const langs =
    langIds.length === 0
      ? await getAllLanguages()
      : await getLanguagesByIds(langIds);

  if (!langs || langs.length === 0) {
    return c.json({
      key: 'notFounds',
      message: 'No languages found',
    });
  }

  return c.json(langs);
});

langFeaturesRouter.put('/:id', async c => {
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

langFeaturesRouter.route('/permissions', langPermissions);

export default langFeaturesRouter;
