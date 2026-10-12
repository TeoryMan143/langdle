import { Hono } from 'hono';
import { notFound, parseJsonBody, unknownError } from '@/core/lib/http';
import { cronMiddleware } from '@/core/middleware/cron';
import { authMiddleware } from '@/modules/auth/middleware';
import { getLanguageById } from '@/modules/lang-data/service';
import { guessHistoryReqSchema } from './schemas/guess-history';
import {
  addGuessesHistory,
  getDailyLang,
  getGuessesHistory,
  getMatching,
  getTargetLang,
  rollDailyLang,
} from './service';

const langGuessRouter = new Hono();

langGuessRouter.get('/daily', async c => {
  return c.json(await getDailyLang());
});

langGuessRouter.get('/history', authMiddleware, async c => {
  const history = await getGuessesHistory(c.get('user').id);

  if (!history) {
    return unknownError(c, 'The history could not be read');
  }

  return c.json(history);
});

langGuessRouter.put('/history', authMiddleware, async c => {
  const parsed = await parseJsonBody(c, guessHistoryReqSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const historyResult = await addGuessesHistory(c.get('user').id, parsed.data);

  if (!historyResult) {
    return unknownError(c, 'The history could not be saved');
  }

  return c.json(historyResult);
});

langGuessRouter.get('/jobs/daily', cronMiddleware, async c => {
  try {
    const lang = await rollDailyLang();
    console.log('DAYLANG: ', lang.id);
    return c.json({ success: true, lang: lang.id });
  } catch (e) {
    console.error(e);
    return unknownError(c, 'The daily language could not be set');
  }
});

/**
 * Compares a guess with the target language. Answers the whole target when the
 * guess is the right one, the feature matching otherwise.
 */
langGuessRouter.get('/:id', async c => {
  const id = c.req.param('id');

  const target = await getTargetLang(c.req.query('target'));

  if (!target) {
    return notFound(c, 'Language not found');
  }

  if (id === target.id) {
    return c.json({ guessed: target });
  }

  const guessedLang = await getLanguageById(id);

  if (!guessedLang) {
    return notFound(c, 'Language not found');
  }

  return c.json(getMatching(guessedLang, target));
});

export default langGuessRouter;
