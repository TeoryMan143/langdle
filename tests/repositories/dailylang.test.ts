import { expect, test } from 'vitest';
import { Language, LanguageMatching } from '@/core/lib/types';
import dailyRepository from '../../src/app/api/repositories/dailylang';

test('the language should match the right features', async () => {
  const targetEx: Language = {
    id: 'ex',
    active: false,
    name: 'example',
    features: [
      'abjad',
      'aspect',
      'aspiratedConsonants',
      'augmentatives',
      'retroflexConsonants',
    ],
    partial: [
      'doubleNegation',
      'proDrop',
      'postpositions',
      'ejectiveConsonants',
    ],
  };

  const guessedEx: Language = {
    id: 'ex2',
    active: false,
    name: 'example2',
    features: [
      'aspect',
      'augmentatives',
      'postpositions',
      'evidentiality',
      'palatalization',
    ],
    partial: ['abjad', 'aspiratedConsonants', 'proDrop', 'openSyllablesOnly'],
  };

  const matching = await dailyRepository.getMatching(guessedEx, targetEx);

  console.log(matching);

  expect(matching).toEqual({
    correct: ['abjad', 'aspect', 'aspiratedConsonants', 'augmentatives'],
    incorrect: ['evidentiality', 'palatalization', 'openSyllablesOnly'],
    partial: ['proDrop', 'postpositions'],
  } satisfies LanguageMatching);
});
