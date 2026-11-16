import { describe, expect, it } from 'vitest';
import { safeNextPath, withNext } from '@/core/lib/redirect';

describe('safeNextPath', () => {
  it('keeps internal paths', () => {
    expect(safeNextPath('/data/es')).toBe('/data/es');
    expect(safeNextPath('/addpermission?token=abc')).toBe(
      '/addpermission?token=abc',
    );
  });

  it('drops anything that could leave the site', () => {
    for (const value of [
      null,
      undefined,
      '',
      'data',
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
    ]) {
      expect(safeNextPath(value)).toBeNull();
    }
  });
});

describe('withNext', () => {
  it('appends an encoded next', () => {
    expect(withNext('/signin', '/addpermission?token=a&b')).toBe(
      '/signin?next=%2Faddpermission%3Ftoken%3Da%26b',
    );
    expect(withNext('/endgoogle?data=x', '/account')).toBe(
      '/endgoogle?data=x&next=%2Faccount',
    );
  });

  it('leaves the path alone without a safe next', () => {
    expect(withNext('/signin', null)).toBe('/signin');
    expect(withNext('/signin', '//evil.com')).toBe('/signin');
  });
});
