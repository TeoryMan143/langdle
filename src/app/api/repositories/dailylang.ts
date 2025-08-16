import { getStringByKey } from '@/core/database/redis/key-getters';
import type {
  LangFeatures,
  Language,
  LanguageMatching,
} from '@/core/lib/types';
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

async function getMatching(
  guessedLang: Language,
  targetLang: Language,
): Promise<LanguageMatching> {
  const guessFeatures = new Set(guessedLang.features as LangFeatures[]);
  const guessPartial = new Set(guessedLang.partial as LangFeatures[]);
  const dailyFeatures = new Set(targetLang.features as LangFeatures[]);
  const dailyPartial = new Set(targetLang.partial as LangFeatures[]);

  const correct = [
    ...dailyFeatures.intersection(guessFeatures.union(guessPartial)),
  ];
  const partial = [
    ...dailyPartial.intersection(guessFeatures.union(guessPartial)),
  ];
  const incorrect = [
    ...guessFeatures
      .union(guessPartial)
      .difference(dailyFeatures.union(dailyPartial)),
  ];

  return { correct, incorrect, partial };
}

export default { isDaily, getMatching, getDailyLang };
