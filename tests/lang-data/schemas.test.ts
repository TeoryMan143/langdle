import { describe, expect, test } from 'vitest';
import { langDataSchema } from '@/core/schemas/lang';
import {
  changeRequestBodySchema,
  changeRequestSchema,
  changeRequestStateSchema,
  createChangeRequestSchema,
  createRejectChangeRequestSchema,
  rejectChangeRequestSchema,
} from '@/modules/lang-data/schemas/change-request';
import { fieldErrorsOf } from '../support/schemas';

const request = {
  lang: 'spanish',
  feature: 'tones',
  status: 'present',
  description: 'Spanish has no tones',
};

describe('changeRequestSchema', () => {
  test('accepts a request and answers exactly its fields', () => {
    expect(
      changeRequestSchema.parse({ ...request, state: 'accepted' }),
    ).toEqual(request);
  });

  test.each([
    ['an empty language', { lang: '' }, 'lang'],
    ['an unknown feature', { feature: 'notAFeature' }, 'feature'],
    ['an unknown status', { status: 'maybe' }, 'status'],
    ['an empty description', { description: '' }, 'description'],
    [
      'a description over 1000',
      { description: 'a'.repeat(1001) },
      'description',
    ],
    ['a feature that is not a string', { feature: 1 }, 'feature'],
  ])('rejects %s', (_, override, field) => {
    const result = changeRequestSchema.safeParse({ ...request, ...override });

    expect(result.success).toBe(false);
    expect(Object.keys(fieldErrorsOf(result))).toEqual([field]);
  });

  test('accepts a description of exactly 1000 characters', () => {
    expect(
      changeRequestSchema.safeParse({
        ...request,
        description: 'a'.repeat(1000),
      }).success,
    ).toBe(true);
  });

  test('the empty description message comes from the translator', () => {
    const schema = createChangeRequestSchema(key => `translated:${key}`);
    const result = schema.safeParse({ ...request, description: '' });

    expect(fieldErrorsOf(result)).toEqual({
      description: ['translated:descriptionRequired'],
    });
    expect(
      fieldErrorsOf(
        changeRequestSchema.safeParse({ ...request, description: '' }),
      ),
    ).toEqual({ description: ['Description is required'] });
  });

  test('the API body takes an optional known locale', () => {
    expect(changeRequestBodySchema.parse(request)).toEqual(request);
    expect(changeRequestBodySchema.parse({ ...request, locale: 'es' })).toEqual(
      { ...request, locale: 'es' },
    );
    expect(
      changeRequestBodySchema.safeParse({ ...request, locale: 'fr' }).success,
    ).toBe(false);
  });
});

describe('rejectChangeRequestSchema', () => {
  test('trims the reason', () => {
    expect(rejectChangeRequestSchema.parse({ reason: '  wrong  ' })).toEqual({
      reason: 'wrong',
    });
  });

  test.each(['', '   '])(
    'a blank reason "%s" answers the required message',
    reason => {
      expect(
        fieldErrorsOf(rejectChangeRequestSchema.safeParse({ reason })),
      ).toEqual({ reason: ['A reason is required'] });
    },
  );

  test('the required message comes from the translator', () => {
    const schema = createRejectChangeRequestSchema(key => `translated:${key}`);

    expect(fieldErrorsOf(schema.safeParse({ reason: '' }))).toEqual({
      reason: ['translated:reasonRequired'],
    });
  });

  test('a reason takes up to 500 characters', () => {
    expect(
      rejectChangeRequestSchema.safeParse({ reason: 'a'.repeat(500) }).success,
    ).toBe(true);
    expect(
      rejectChangeRequestSchema.safeParse({ reason: 'a'.repeat(501) }).success,
    ).toBe(false);
    expect(rejectChangeRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe('changeRequestStateSchema', () => {
  test('knows the three states and nothing else', () => {
    for (const state of ['pending', 'accepted', 'rejected']) {
      expect(changeRequestStateSchema.parse(state)).toBe(state);
    }

    expect(changeRequestStateSchema.safeParse('open').success).toBe(false);
    expect(changeRequestStateSchema.safeParse(undefined).success).toBe(false);
  });
});

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
