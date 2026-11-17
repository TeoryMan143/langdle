import { describe, expect, test } from 'vitest';
import { matchRank, normalizeSearchText, searchTerms } from '@/core/lib/search';

describe('normalizeSearchText', () => {
  test('drops case, accents and extra spaces', () => {
    expect(normalizeSearchText('  Català ')).toBe('catala');
    expect(normalizeSearchText('Ñandú   Guaraní')).toBe('nandu guarani');
  });
});

describe('searchTerms', () => {
  test('finds a language by its id and every name', () => {
    expect(
      searchTerms({
        id: 'spa',
        name: 'Spanish',
        exonym: 'Español',
        searchParams: ['Castellano', ''],
      }),
    ).toEqual(['spa', 'spanish', 'espanol', 'castellano']);
  });
});

describe('matchRank', () => {
  test('ranks a whole term, then its start, a word start and anywhere', () => {
    expect(matchRank(['ale'], 'ale')).toBe(0);
    expect(matchRank(['aleut'], 'ale')).toBe(1);
    expect(matchRank(['old ale'], 'ale')).toBe(2);
    expect(matchRank(['kale'], 'ale')).toBe(3);
    expect(matchRank(['zulu'], 'ale')).toBeNull();
  });

  test('keeps the best match among the terms', () => {
    expect(matchRank(['kale', 'aleut', 'old ale'], 'ale')).toBe(1);
  });

  test('forgives a typo per four letters typed, last', () => {
    expect(matchRank(['spanish'], 'spanich')).toBe(4);
    expect(matchRank(['spanish'], 'spsni')).toBe(4);
    expect(matchRank(['old english'], 'englsh')).toBe(4);
    expect(matchRank(['spanish'], 'sponoch')).toBeNull();
  });

  test('forgives no typo below four letters', () => {
    expect(matchRank(['ale'], 'alx')).toBeNull();
  });
});
