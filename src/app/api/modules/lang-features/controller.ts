import { Hono } from 'hono';
import { langCodeSchema, langDataSchema } from '@/core/lib/schemas/langs';
import { getAllLanguages, getLanguageById, setLanguageData } from './action';

const langFeatures = new Hono();

langFeatures.get('/:id', async c => {
  const { error, data: langId } = langCodeSchema.safeParse(c.req.param('id'));

  if (error) {
    return c.json(
      {
        message: 'Error invalid language code',
      },
      400,
    );
  }

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
  const langs = await getAllLanguages();

  if (!langs || langs.length === 0) {
    return c.json({
      message: 'No languages found',
    });
  }

  return c.json(langs);
});

langFeatures.put('/:id', async c => {
  const { error: idError, data: langId } = langCodeSchema.safeParse(
    c.req.param('id'),
  );

  if (idError) {
    return c.json(
      {
        message: 'Error invalid language code',
      },
      400,
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

export default langFeatures;
