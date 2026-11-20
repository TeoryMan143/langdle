import { expect, test } from 'vitest';
import type { LanguageData } from '@/core/types';
import {
  applyFeatureStatus,
  getFeatureStatus,
} from '@/modules/lang-data/service';

const lang: LanguageData = {
  name: 'example',
  active: true,
  features: ['svo', 'tones'],
  partial: ['aspect'],
  searchParams: [],
};

test('reads the status of a feature', () => {
  expect(getFeatureStatus(lang, 'tones')).toBe('present');
  expect(getFeatureStatus(lang, 'aspect')).toBe('partial');
  expect(getFeatureStatus(lang, 'sov')).toBe('absent');
});

test('moves a feature to the requested status', () => {
  const toPartial = applyFeatureStatus(lang, 'tones', 'partial');
  expect(toPartial.features).toEqual(['svo']);
  expect(toPartial.partial).toEqual(['aspect', 'tones']);

  const toPresent = applyFeatureStatus(lang, 'aspect', 'present');
  expect(toPresent.features).toEqual(['aspect', 'svo', 'tones']);
  expect(toPresent.partial).toEqual([]);

  const toAbsent = applyFeatureStatus(lang, 'svo', 'absent');
  expect(toAbsent.features).toEqual(['tones']);
  expect(toAbsent.partial).toEqual(['aspect']);
});

test('keeps the other fields and does not mutate the input', () => {
  const result = applyFeatureStatus(lang, 'sov', 'present');

  expect(result.name).toBe('example');
  expect(result.features).toEqual(['sov', 'svo', 'tones']);
  expect(lang.features).toEqual(['svo', 'tones']);
});
