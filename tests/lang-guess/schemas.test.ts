import { expect, test } from 'vitest';
import { guessHistoryReqSchema } from '@/modules/lang-guess/schemas/guess-history';
import { fieldErrorsOf } from '../support/schemas';

const game = {
  type: 'daily',
  targetLang: 'spanish',
  guesses: 3,
  guessed: true,
};

test('accepts a finished game and answers exactly its fields', () => {
  expect(guessHistoryReqSchema.parse({ ...game, userId: 'x' })).toEqual(game);
  expect(
    guessHistoryReqSchema.parse({ ...game, type: 'random', guesses: 0 }),
  ).toEqual({ ...game, type: 'random', guesses: 0 });
});

test.each([
  ['an unknown type', { type: 'weekly' }, 'type'],
  ['negative guesses', { guesses: -1 }, 'guesses'],
  ['guesses sent as text', { guesses: '3' }, 'guesses'],
  ['guesses that are not a number', { guesses: Number.NaN }, 'guesses'],
  ['a target that is not a string', { targetLang: 7 }, 'targetLang'],
  ['a result sent as text', { guessed: 'true' }, 'guessed'],
])('rejects %s', (_, override, field) => {
  const result = guessHistoryReqSchema.safeParse({ ...game, ...override });

  expect(result.success).toBe(false);
  expect(Object.keys(fieldErrorsOf(result))).toEqual([field]);
});

test.each(['type', 'targetLang', 'guesses', 'guessed'] as const)(
  'needs %s',
  field => {
    const { [field]: _, ...rest } = game;

    expect(guessHistoryReqSchema.safeParse(rest).success).toBe(false);
  },
);
