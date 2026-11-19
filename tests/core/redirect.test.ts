import { describe, expect, it } from 'vitest';
import { safeNextPath, signedOutRedirect, withNext } from '@/core/lib/redirect';

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

describe('signedOutRedirect', () => {
  it('sends the pages that need a session to sign in, coming back after', () => {
    expect(signedOutRedirect('/account')).toBe('/signin?next=%2Faccount');
    expect(signedOutRedirect('/data')).toBe('/signin?next=%2Fdata');
    expect(signedOutRedirect('/data/es')).toBe('/signin?next=%2Fdata%2Fes');
    expect(signedOutRedirect('/data/review/')).toBe(
      '/signin?next=%2Fdata%2Freview',
    );
    expect(signedOutRedirect('/data/request-language')).toBe(
      '/signin?next=%2Fdata%2Frequest-language',
    );
  });

  it('sends a permission link to sign up, keeping its token', () => {
    expect(signedOutRedirect('/addpermission', '?token=a&b=1')).toBe(
      '/signup?next=%2Faddpermission%3Ftoken%3Da%26b%3D1',
    );
  });

  it('lets the open pages through', () => {
    for (const [path, search] of [
      ['/', ''],
      ['/random', ''],
      ['/data/public', ''],
      ['/database', ''],
      ['/signin', '?next=%2Faccount'],
      ['/addpermission', ''],
    ]) {
      expect(signedOutRedirect(path, search)).toBeNull();
    }
  });
});
