import { describe, expect, test } from 'vitest';
import { langDataSchema } from '@/core/schemas/lang';
import { fieldErrorsOf } from '../support/schemas';

describe('langDataSchema', () => {
  const lang = {
    name: 'Spanish',
    exonym: 'Español',
    features: ['svo'],
    active: true,
    partial: ['tones'],
    searchParams: ['castellano'],
  };

  test('accepts a language, with or without exonym', () => {
    const { exonym: _, ...withoutExonym } = lang;

    expect(langDataSchema.parse({ ...lang, id: 'spanish' })).toEqual(lang);
    expect(langDataSchema.parse(withoutExonym)).toEqual(withoutExonym);
  });

  test('trims the name and the exonym', () => {
    expect(
      langDataSchema.parse({ ...lang, name: ' Spanish ', exonym: ' Español ' }),
    ).toEqual(lang);
  });

  test.each([
    ['an empty name', { name: '' }, 'name'],
    ['an empty exonym', { exonym: '' }, 'exonym'],
    ['an unknown feature', { features: ['svo', 'nope'] }, 'features'],
    ['an unknown partial feature', { partial: ['nope'] }, 'partial'],
    ['features that are not a list', { features: 'svo' }, 'features'],
    ['an active flag that is not a boolean', { active: 'true' }, 'active'],
    [
      'search params that are not strings',
      { searchParams: [1] },
      'searchParams',
    ],
  ])('rejects %s', (_, override, field) => {
    const result = langDataSchema.safeParse({ ...lang, ...override });

    expect(result.success).toBe(false);
    expect(Object.keys(fieldErrorsOf(result))).toEqual([field]);
  });

  test.each(['name', 'features', 'active', 'partial', 'searchParams'] as const)(
    'needs %s',
    field => {
      const { [field]: _, ...rest } = lang;

      expect(langDataSchema.safeParse(rest).success).toBe(false);
    },
  );
});
