import { Hono } from 'hono';
import { langDataSchema } from '@/core/lib/schemas/langs';
import {
  getAllLanguages,
  getLanguageById,
  getLanguagesByIds,
  setLanguageData,
} from './action';
import langPermissions from './permissions/controller';
import { getUserLangPermissions } from './permissions/action';
import { getCookie } from 'hono/cookie';
import { validateSessionToken } from '@/modules/auth/manager';

const langFeatures = new Hono();

langFeatures.get('/:id', async c => {
  const langId = c.req.param('id');

  const lang = await getLanguageById(langId);

  if (!lang) {
    return c.json(
      {
        message: 'Language not found',
      },
      500,
    );
  }

  return c.json(lang);
});

langFeatures.get('/', async c => {
  const langIds = new URL(c.req.url).searchParams.getAll('id');

  const langs =
    langIds.length === 0
      ? await getAllLanguages()
      : await getLanguagesByIds(langIds);

  if (!langs || langs.length === 0) {
    return c.json({
      message: 'No languages found',
    });
  }

  return c.json(langs);
});

langFeatures.put('/:id', async c => {
  const langId = c.req.param('id');

  const lang = await getLanguageById(langId);

  if (!lang) {
    return c.json(
      {
        message: 'Error invalid language code',
      },
      400,
    );
  }

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

  const permissions = await getUserLangPermissions(user.id);

  if (!permissions.includes(langId)) {
    return c.json(
      {
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
        message: 'Unknown error, the language data could not be set',
      },
      500,
    );
  }

  return c.json({
    message: 'Language set',
  });
});

langFeatures.route('/permissions', langPermissions);

export default langFeatures;
