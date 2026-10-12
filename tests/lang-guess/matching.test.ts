import { expect, test } from 'vitest';
import type { Language } from '@/core/types';
import { getMatching } from '@/modules/lang-guess/service';
import type { LanguageMatching } from '@/modules/lang-guess/types';

test('the language should match the right features', () => {
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
    searchParams: [],
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
    searchParams: [],
  };

  const matching = getMatching(guessedEx, targetEx);

  expect(matching).toEqual({
    correct: ['abjad', 'aspect', 'aspiratedConsonants', 'augmentatives'],
    incorrect: ['evidentiality', 'palatalization', 'openSyllablesOnly'],
    partial: ['proDrop', 'postpositions'],
  } satisfies LanguageMatching);
});
