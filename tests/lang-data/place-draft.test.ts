import { describe, expect, test } from 'vitest';
import {
  fromPlaceDraft,
  toPlaceDraft,
} from '@/modules/lang-data/components/lang-place-fields';

const empty = { family: '', genus: '', locations: [] };

describe('fromPlaceDraft', () => {
  test('turns the typed fields into the body of a PUT', () => {
    expect(
      fromPlaceDraft({
        family: ' Indo-European ',
        genus: 'Romance',
        locations: [
          { lat: '40', lng: '-4' },
          { lat: '19.4', lng: '-99.1' },
        ],
      }),
    ).toEqual({
      family: 'Indo-European',
      genus: 'Romance',
      locations: [
        { lat: 40, lng: -4 },
        { lat: 19.4, lng: -99.1 },
      ],
    });
  });

  test('sends emptied fields as null, so the API removes them', () => {
    expect(fromPlaceDraft(empty)).toEqual({
      family: null,
      genus: null,
      locations: null,
    });
  });

  test('skips a blank row', () => {
    expect(
      fromPlaceDraft({ ...empty, locations: [{ lat: ' ', lng: '' }] })
        ?.locations,
    ).toBeNull();
  });

  test.each([
    ['half a point', { lat: '40', lng: '' }],
    ['a latitude off the globe', { lat: '91', lng: '0' }],
    ['a longitude off the globe', { lat: '0', lng: '-181' }],
    ['text', { lat: 'north', lng: '0' }],
  ])('refuses %s', (_, row) => {
    expect(fromPlaceDraft({ ...empty, locations: [row] })).toBeUndefined();
  });

  test('reads back what toPlaceDraft wrote', () => {
    const data = {
      name: 'x',
      active: false,
      features: [],
      partial: [],
      searchParams: [],
      family: 'Basque',
      locations: [{ lat: 43, lng: -3 }],
    };

    expect(fromPlaceDraft(toPlaceDraft(data))).toEqual({
      family: 'Basque',
      genus: null,
      locations: [{ lat: 43, lng: -3 }],
    });
  });
});
