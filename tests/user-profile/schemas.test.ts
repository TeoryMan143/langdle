import { expect, test } from 'vitest';
import {
  updateFluentLangsSchema,
  updateNativeLangSchema,
} from '@/modules/user-profile/schemas/profile';

test('the native language is a non empty string', () => {
  expect(updateNativeLangSchema.parse({ nativeLang: 'spanish', x: 1 })).toEqual(
    { nativeLang: 'spanish' },
  );

  for (const body of [{}, { nativeLang: '' }, { nativeLang: 1 }, null]) {
    expect(updateNativeLangSchema.safeParse(body).success).toBe(false);
  }
});

test('the fluent languages are a list of strings, empty included', () => {
  expect(updateFluentLangsSchema.parse({ fluent: [] })).toEqual({ fluent: [] });
  expect(
    updateFluentLangsSchema.parse({ fluent: ['spanish', 'english'] }),
  ).toEqual({ fluent: ['spanish', 'english'] });

  for (const body of [{}, { fluent: 'spanish' }, { fluent: [1] }, null]) {
    expect(updateFluentLangsSchema.safeParse(body).success).toBe(false);
  }
});
