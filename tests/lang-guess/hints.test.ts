import { describe, expect, test } from 'vitest';
import type { Language } from '@/core/types';
import {
  bearing,
  closestPair,
  distanceKm,
  getHints,
} from '@/modules/lang-guess/service';

const madrid = { lat: 40.4168, lng: -3.7038 };
const paris = { lat: 48.8566, lng: 2.3522 };

function lang(overrides: Partial<Language>): Language {
  return {
    id: 'x',
    name: 'x',
    active: true,
    features: [],
    partial: [],
    searchParams: [],
    ...overrides,
  };
}

describe('distanceKm', () => {
  test('is the great-circle distance', () => {
    expect(distanceKm(madrid, paris)).toBeCloseTo(1053, -1);
    expect(distanceKm(madrid, madrid)).toBe(0);
  });
});

describe('bearing', () => {
  test('points clockwise from north', () => {
    const origin = { lat: 0, lng: 0 };

    expect(bearing(origin, { lat: 10, lng: 0 })).toBeCloseTo(0);
    expect(bearing(origin, { lat: 0, lng: 10 })).toBeCloseTo(90);
    expect(bearing(origin, { lat: -10, lng: 0 })).toBeCloseTo(180);
    expect(bearing(origin, { lat: 0, lng: -10 })).toBeCloseTo(270);
  });

  test('from Madrid, Paris is to the north-east', () => {
    expect(bearing(madrid, paris)).toBeGreaterThan(20);
    expect(bearing(madrid, paris)).toBeLessThan(45);
  });
});

describe('closestPair', () => {
  const lisbon = { lat: 38.7, lng: -9.1 };
  const brasilia = { lat: -15.8, lng: -47.9 };
  const mexico = { lat: 19.4, lng: -99.1 };

  test('picks the two points nearest each other', () => {
    expect(closestPair([lisbon, brasilia], [mexico, madrid])).toEqual([
      lisbon,
      madrid,
    ]);
  });

  test('has nothing to pick from an empty side', () => {
    expect(closestPair([], [madrid])).toBeUndefined();
    expect(closestPair([madrid])).toBeUndefined();
  });
});

describe('getHints', () => {
  const spanish = lang({
    locations: [madrid],
    family: 'Indo-European',
    genus: 'Romance',
  });

  test('gives distance and direction to the target', () => {
    const hints = getHints(lang({ locations: [paris] }), spanish);

    expect(hints.distanceKm).toBe(Math.round(distanceKm(paris, madrid)));
    expect(hints.bearing).toBe(Math.round(bearing(paris, madrid)));
  });

  test('measures between the closest points of each language', () => {
    const portuguese = lang({
      locations: [
        { lat: -15.8, lng: -47.9 },
        { lat: 38.7, lng: -9.1 },
      ],
    });
    const hints = getHints(portuguese, spanish);

    expect(hints.distanceKm).toBeLessThan(600);
    // From Lisbon, Madrid is east-north-east.
    expect(hints.bearing).toBeGreaterThan(45);
    expect(hints.bearing).toBeLessThan(90);
  });

  test('has no direction for two languages at the same point', () => {
    const hints = getHints(lang({ locations: [madrid] }), spanish);

    expect(hints).toEqual({ distanceKm: 0 });
  });

  test.each([
    ['genus', { family: 'Indo-European', genus: 'Romance' }],
    ['family', { family: 'Indo-European', genus: 'Germanic' }],
    ['none', { family: 'Basque', genus: 'Basque' }],
  ] as const)('tells a %s relation', (relation, guess) => {
    expect(getHints(lang(guess), spanish).relation).toBe(relation);
  });

  test('says nothing without the data behind a hint', () => {
    expect(getHints(lang({}), spanish)).toEqual({});
    expect(
      getHints(lang({ family: 'Basque', locations: [paris] }), lang({})),
    ).toEqual({});
  });
});
