import { describe, expect, test } from 'vitest';
import {
  matchRank,
  normalizeSearchText,
  rankByQuery,
  searchTerms,
  typoDistance,
} from '@/core/lib/search';

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

describe('typoDistance', () => {
  test('counts letters added, removed and replaced', () => {
    expect(typoDistance('spanish', 'spanish')).toBe(0);
    expect(typoDistance('spanich', 'spanish')).toBe(1);
    expect(typoDistance('spansh', 'spanish')).toBe(1);
    expect(typoDistance('spannish', 'spanish')).toBe(1);
    expect(typoDistance('', 'abc')).toBe(3);
  });

  test('counts two neighbouring letters swapped as one typo', () => {
    expect(typoDistance('spanihs', 'spanish')).toBe(1);
    expect(typoDistance('psanish', 'spanish')).toBe(1);
    expect(typoDistance('sapnihs', 'spanish')).toBe(2);
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
    expect(matchRank(['spanish'], 'spanihs')).toBe(4);
    expect(matchRank(['basque'], 'bsaq')).toBe(4);
    expect(matchRank(['spanish'], 'spsni')).toBe(4);
    expect(matchRank(['old english'], 'englsh')).toBe(4);
    expect(matchRank(['spanish'], 'sponoch')).toBeNull();
  });

  test('forgives no typo below four letters', () => {
    expect(matchRank(['ale'], 'alx')).toBeNull();
  });
});

describe('rankByQuery', () => {
  const items = ['kale', 'aleut', 'ale', 'zulu'].map(name => ({
    item: name,
    terms: [name],
  }));

  test('keeps every item, in order, without a query', () => {
    expect(rankByQuery(items, '  ')).toEqual(['kale', 'aleut', 'ale', 'zulu']);
  });

  test('keeps the matches, best first', () => {
    expect(rankByQuery(items, 'ALE')).toEqual(['ale', 'aleut', 'kale']);
  });
});
