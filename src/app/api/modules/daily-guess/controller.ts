import { Hono } from 'hono';
import type { Language } from '@/core/lib/types';
import dailyRepository from '../../repositories/dailylang';
import langRepository from '../../repositories/langs';

const dailyGuessRouter = new Hono();

dailyGuessRouter.get('/daily', async c => {
  const dailylang = await dailyRepository.getDailyLang();
  return c.json(dailylang);
});

dailyGuessRouter.get('/:id', async c => {
  const id = c.req.param('id');

  const targetId = new URL(c.req.url).searchParams.get('target');

  let target: Language | undefined;

  if (!targetId || targetId === 'daily') {
    target = await dailyRepository.getDailyLang();
  } else {
    target = await langRepository.getById(targetId);
  }

  if (!target) {
    return c.json(
      {
        key: 'noLang',
        massage: 'Language not found',
      },
      404,
    );
  }

  if (id === target.id) {
    return c.json({
      guessed: target,
    });
  }

  const guessedLang = await langRepository.getById(id);

  if (!guessedLang) {
    return c.json(
      {
        key: 'noLang',
        massage: 'Language not found',
      },
      404,
    );
  }

  const matching = await dailyRepository.getMatching(guessedLang, target);

  return c.json(matching);
});

export default dailyGuessRouter;
