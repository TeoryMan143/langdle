import { describe, expect, test } from 'vitest';
import { api } from '../support/api';
import { createTestUser, seedLanguage } from '../support/factories';

describe('GET /user/:id', () => {
  test('answers the public profile', async () => {
    const { user } = await createTestUser({
      nickname: 'ana',
      nativeLanguage: 'spanish',
      fluent: 'basque,zulu',
    });

    const res = await api('GET', `/user/${user.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: user.id,
      nickname: 'ana',
      country: 'ES',
      admin: false,
      nativeLanguage: 'spanish',
      fluent: 'basque,zulu',
    });
  });

  test('never answers the password', async () => {
    const { user } = await createTestUser();

    const res = await api('GET', `/user/${user.id}`);

    expect(res.body).not.toHaveProperty('password');
    expect(res.text).not.toContain('argon2');
  });

  test('never answers the email or the OAuth ids', async () => {
    const { user } = await createTestUser({
      googleId: 'google-secret',
      appleId: 'apple-secret',
    });

    const res = await api('GET', `/user/${user.id}`);

    expect(res.body).not.toHaveProperty('email');
    expect(res.text).not.toContain(user.email);
    expect(res.text).not.toContain('google-secret');
    expect(res.text).not.toContain('apple-secret');
  });

  test('answers 404 for a user that does not exist', async () => {
    const res = await api('GET', `/user/${crypto.randomUUID()}`);

    expect(res.status).toBe(404);
    expect(res.body.key).toBe('notFound');
  });

  test('answers 404 for an id that is not a uuid', async () => {
    const res = await api('GET', '/user/not-a-uuid');

    expect(res.status).toBe(404);
  });
});

describe('PUT /user/native-lang', () => {
  test('requires a session', async () => {
    const res = await api('PUT', '/user/native-lang', {
      body: { nativeLang: 'spanish' },
    });

    expect(res.status).toBe(401);
  });

  test('sets the native language', async () => {
    await seedLanguage('spanish');
    const { user, token } = await createTestUser();

    const res = await api('PUT', '/user/native-lang', {
      token,
      body: { nativeLang: 'spanish' },
    });

    expect(res.status).toBe(200);
    expect(res.body.updated).toMatchObject({
      id: user.id,
      nativeLanguage: 'spanish',
    });
    expect(res.body.updated).not.toHaveProperty('password');
    expect((await api('GET', `/user/${user.id}`)).body.nativeLanguage).toBe(
      'spanish',
    );
  });

  test('can be changed later', async () => {
    await seedLanguage('spanish');
    await seedLanguage('basque');
    const { user, token } = await createTestUser();

    await api('PUT', '/user/native-lang', {
      token,
      body: { nativeLang: 'spanish' },
    });
    await api('PUT', '/user/native-lang', {
      token,
      body: { nativeLang: 'basque' },
    });

    expect((await api('GET', `/user/${user.id}`)).body.nativeLanguage).toBe(
      'basque',
    );
  });

  test('only changes the caller', async () => {
    await seedLanguage('spanish');
    const me = await createTestUser();
    const other = await createTestUser();

    await api('PUT', '/user/native-lang', {
      token: me.token,
      body: { nativeLang: 'spanish' },
    });

    expect(
      (await api('GET', `/user/${other.user.id}`)).body.nativeLanguage,
    ).toBeNull();
  });

  test('answers 404 for a language that does not exist', async () => {
    const { user, token } = await createTestUser();

    const res = await api('PUT', '/user/native-lang', {
      token,
      body: { nativeLang: 'klingon' },
    });

    expect(res.status).toBe(404);
    expect(
      (await api('GET', `/user/${user.id}`)).body.nativeLanguage,
    ).toBeNull();
  });

  test.each([
    ['no language', {}],
    ['an empty language', { nativeLang: '' }],
    ['a language that is not text', { nativeLang: 5 }],
  ])('rejects %s', async (_, body) => {
    const { token } = await createTestUser();

    const res = await api('PUT', '/user/native-lang', { token, body });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidData');
  });
});

describe('PUT /user/fluent', () => {
  test('requires a session', async () => {
    const res = await api('PUT', '/user/fluent', { body: { fluent: [] } });

    expect(res.status).toBe(401);
  });

  test('stores the fluent languages', async () => {
    await seedLanguage('spanish');
    await seedLanguage('basque');
    const { user, token } = await createTestUser();

    const res = await api('PUT', '/user/fluent', {
      token,
      body: { fluent: ['spanish', 'basque'] },
    });

    expect(res.status).toBe(200);
    expect(res.body.updated.fluent).toBe('spanish,basque');
    expect((await api('GET', `/user/${user.id}`)).body.fluent).toBe(
      'spanish,basque',
    );
  });

  test('replaces the previous list', async () => {
    await seedLanguage('spanish');
    await seedLanguage('basque');
    const { user, token } = await createTestUser();

    await api('PUT', '/user/fluent', {
      token,
      body: { fluent: ['spanish', 'basque'] },
    });
    await api('PUT', '/user/fluent', { token, body: { fluent: ['basque'] } });

    expect((await api('GET', `/user/${user.id}`)).body.fluent).toBe('basque');
  });

  test('an empty list clears them', async () => {
    await seedLanguage('spanish');
    const { user, token } = await createTestUser();
    await api('PUT', '/user/fluent', { token, body: { fluent: ['spanish'] } });

    const res = await api('PUT', '/user/fluent', {
      token,
      body: { fluent: [] },
    });

    expect(res.status).toBe(200);
    expect(res.body.updated.fluent).toBeNull();
    expect((await api('GET', `/user/${user.id}`)).body.fluent).toBeNull();
  });

  test('answers 404 when any of the languages does not exist', async () => {
    await seedLanguage('spanish');
    const { user, token } = await createTestUser();

    const res = await api('PUT', '/user/fluent', {
      token,
      body: { fluent: ['spanish', 'klingon'] },
    });

    expect(res.status).toBe(404);
    expect((await api('GET', `/user/${user.id}`)).body.fluent).toBeNull();
  });

  test.each([
    ['no list', {}],
    ['a list that is not an array', { fluent: 'spanish' }],
    ['a list of numbers', { fluent: [1, 2] }],
  ])('rejects %s', async (_, body) => {
    const { token } = await createTestUser();

    const res = await api('PUT', '/user/fluent', { token, body });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidData');
  });
});
