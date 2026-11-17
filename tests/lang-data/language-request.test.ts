import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import { normalizeFlag } from '@/core/lib/flags';
import {
  fromFeatureStates,
  toFeatureStates,
} from '@/modules/lang-data/components/feature-status-picker';
import {
  createLanguageRequestSchema,
  languageRequestBodySchema,
  languageRequestSchema,
} from '@/modules/lang-data/schemas/language-request';

const request = {
  code: 'eu',
  name: 'Euskara',
  exonym: 'Basque',
  features: ['sov'],
  partial: ['palatalization'],
  description: 'A language isolate',
};

describe('languageRequestSchema', () => {
  test('accepts a complete request', () => {
    expect(languageRequestSchema.parse(request)).toEqual(request);
  });

  test('trims and lowercases the code, drops an empty exonym', () => {
    const parsed = languageRequestSchema.parse({
      ...request,
      code: ' HAK ',
      exonym: '',
    });

    expect(parsed.code).toBe('hak');
    expect(parsed.exonym).toBeUndefined();
  });

  test.each(['e', 'abcd', 'e1', 'e-u'])('rejects the code %s', code => {
    expect(languageRequestSchema.safeParse({ ...request, code }).success).toBe(
      false,
    );
  });

  test('a feature cannot be both present and partial', () => {
    const t = (key: string) => `t:${key}`;
    const res = createLanguageRequestSchema(t).safeParse({
      ...request,
      partial: ['sov'],
    });

    expect(res.success).toBe(false);
    expect(res.error?.issues[0]).toMatchObject({
      path: ['partial'],
      message: 't:featureTwice',
    });
  });

  test('the body takes an optional supported locale', () => {
    expect(
      languageRequestBodySchema.safeParse({ ...request, locale: 'pt' }).success,
    ).toBe(true);
    expect(
      languageRequestBodySchema.safeParse({ ...request, locale: 'fr' }).success,
    ).toBe(false);
  });
});

describe('feature states', () => {
  test('round trip between the stored lists and the picker', () => {
    const states = toFeatureStates({
      features: ['tones', 'sov'],
      partial: ['nasalization'],
    });

    expect(states.tones).toBe('present');
    expect(states.nasalization).toBe('partial');
    expect(states.vso).toBe('notPresent');
    expect(fromFeatureStates(states)).toEqual({
      features: ['sov', 'tones'],
      partial: ['nasalization'],
    });
  });
});

describe('normalizeFlag', () => {
  test('turns any image into a 455×304 WebP', async () => {
    const png = await sharp({
      create: { width: 900, height: 900, channels: 4, background: '#00f' },
    })
      .png()
      .toBuffer();

    const flag = await normalizeFlag(new Uint8Array(png));

    expect(flag).not.toBeNull();
    expect(await sharp(flag as Uint8Array).metadata()).toMatchObject({
      format: 'webp',
      width: 455,
      height: 304,
    });
  });

  test('gives null for something that is not an image', async () => {
    expect(
      await normalizeFlag(new TextEncoder().encode('<svg></svg> nope')),
    ).toBeNull();
  });
});
