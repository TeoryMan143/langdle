import { getStringByKey } from '@/core/database/redis/key-getters';
import type { Language, LanguageMatching } from '@/core/lib/types';
import langRepository from './langs';

async function getDailyLang() {
  const daily = await getStringByKey('daylang');

  if (!daily) {
    throw new Error('daily lang not defined');
  }

  const lang = await langRepository.getById(daily);

  if (!lang) {
    throw new Error('daily lang not defined');
  }

  return lang;
}

async function isDaily(guess: string) {
  const daily = await getDailyLang();
  return guess === daily.id;
}

async function getMatching(guessedLang: Language): Promise<LanguageMatching> {
  const dailyLang = await getDailyLang();

  const guessFeatures = new Set(guessedLang.features);
  const dailyFeatures = new Set(dailyLang.features);

  const correct = [...dailyFeatures.intersection(guessFeatures)];
  const incorrect = [...guessFeatures.difference(dailyFeatures)];

  return { correct, incorrect };
}

export default { isDaily, getMatching, getDailyLang };
