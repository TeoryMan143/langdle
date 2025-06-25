import { Hono } from 'hono';
import dailyRepository from '../../repositories/dailylang';
import langRepository from '../../repositories/langs';

const dailyGuessRouter = new Hono();

dailyGuessRouter.get('/:id', async c => {
  const id = c.req.param('id');

  const isCorrect = await dailyRepository.isDaily(id);

  if (isCorrect) {
    const dailylang = await dailyRepository.getDailyLang();

    return c.json({
      guessed: dailylang,
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

  const matching = await dailyRepository.getMatching(guessedLang);

  return c.json(matching);
});

export default dailyGuessRouter;
