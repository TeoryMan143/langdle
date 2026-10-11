import { Hono } from 'hono';
import { notFound, parseJsonBody, unknownError } from '@/core/lib/http';
import { authMiddleware } from '@/modules/auth/middleware';
import {
  getLanguageById,
  getLanguagesByIds,
} from '@/modules/lang-data/service';
import {
  updateFluentLangsSchema,
  updateNativeLangSchema,
} from './schemas/profile';
import {
  getUserProfile,
  setFluentLanguages,
  setNativeLanguage,
} from './service';

const userProfileRouter = new Hono();

userProfileRouter.put('/native-lang', authMiddleware, async c => {
  const parsed = await parseJsonBody(c, updateNativeLangSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const lang = await getLanguageById(parsed.data.nativeLang);

  if (!lang) {
    return notFound(c, 'The native language provided is not in our options');
  }

  const updated = await setNativeLanguage(c.get('user').id, lang.id);

  if (!updated) {
    return unknownError(c, 'The user could not be updated');
  }

  return c.json({ updated });
});

userProfileRouter.put('/fluent', authMiddleware, async c => {
  const parsed = await parseJsonBody(c, updateFluentLangsSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const fluentIds = parsed.data.fluent;

  if (fluentIds.length > 0) {
    const langs = await getLanguagesByIds(fluentIds);

    if (langs.some(lang => !lang.name)) {
      return notFound(c, 'A provided language is not in the database');
    }
  }

  const updated = await setFluentLanguages(c.get('user').id, fluentIds);

  if (!updated) {
    return unknownError(c, 'The user could not be updated');
  }

  return c.json({ updated });
});

userProfileRouter.get('/:id', async c => {
  const user = await getUserProfile(c.req.param('id'));

  if (!user) {
    return notFound(c, 'User not found');
  }

  return c.json(user);
});

export default userProfileRouter;
