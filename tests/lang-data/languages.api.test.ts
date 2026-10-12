import { describe, expect, test } from 'vitest';
import { api } from '../support/api';
import {
  createTestAdmin,
  createTestUser,
  getStoredLanguage,
  grantPermission,
  seedLanguage,
} from '../support/factories';

const newData = {
  name: 'Spanish',
  exonym: 'Español',
  active: true,
  features: ['svo', 'tense'],
  partial: ['aspect'],
  searchParams: ['castellano'],
};

describe('GET /lang', () => {
  test('answers 404 while the catalogue is empty', async () => {
    const res = await api('GET', '/lang');

    expect(res.status).toBe(404);
    expect(res.body.key).toBe('notFounds');
  });

  test('lists every language sorted by name', async () => {
    await seedLanguage('zulu', { name: 'Zulu' });
    await seedLanguage('arabic', { name: 'arabic' });
    await seedLanguage('basque', { name: 'Basque' });

    const res = await api('GET', '/lang');

    expect(res.status).toBe(200);
    expect(res.body.map((lang: { id: string }) => lang.id)).toEqual([
      'arabic',
      'basque',
      'zulu',
    ]);
  });

  test('lists the id and the data of each language', async () => {
    await seedLanguage('spanish', {
      name: 'Spanish',
      exonym: 'Español',
      features: ['svo', 'tense'],
      partial: ['aspect'],
      searchParams: ['castellano'],
    });

    const res = await api('GET', '/lang');

    expect(res.body).toEqual([
      {
        id: 'spanish',
        name: 'Spanish',
        exonym: 'Español',
        active: true,
        features: ['svo', 'tense'],
        partial: ['aspect'],
        searchParams: ['castellano'],
      },
    ]);
  });

  test('?oactive=1 lists only the playable languages', async () => {
    await seedLanguage('spanish', { name: 'Spanish', active: true });
    await seedLanguage('latin', { name: 'Latin', active: false });

    const all = await api('GET', '/lang');
    const active = await api('GET', '/lang', { query: { oactive: '1' } });

    expect(all.body).toHaveLength(2);
    expect(active.body.map((lang: { id: string }) => lang.id)).toEqual([
      'spanish',
    ]);
    expect(active.body[0].active).toBe(true);
  });

  test('?oactive=1 answers 404 when nothing is playable', async () => {
    await seedLanguage('latin', { active: false });

    const res = await api('GET', '/lang', { query: { oactive: '1' } });

    expect(res.status).toBe(404);
  });

  test('repeated ?id= fetches just that set, with its full data', async () => {
    await seedLanguage('spanish', { features: ['svo'] });
    await seedLanguage('basque', { features: ['sov'] });
    await seedLanguage('zulu');

    const res = await api('GET', '/lang', {
      query: { id: ['basque', 'spanish'] },
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ id: 'basque', features: ['sov'] });
    expect(res.body[1]).toMatchObject({ id: 'spanish', features: ['svo'] });
  });
});

describe('GET /lang/:id', () => {
  test('answers the language with its id', async () => {
    await seedLanguage('spanish', { name: 'Spanish', features: ['svo'] });

    const res = await api('GET', '/lang/spanish');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 'spanish',
      name: 'Spanish',
      features: ['svo'],
    });
  });

  test('answers 404 for a language that does not exist', async () => {
    const res = await api('GET', '/lang/klingon');

    expect(res.status).toBe(404);
    expect(res.body.key).toBe('notFound');
  });

  test('also answers languages that are not active', async () => {
    await seedLanguage('latin', { active: false });

    const res = await api('GET', '/lang/latin');

    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
  });
});

describe('GET /lang/random', () => {
  test('answers 404 when there are no active languages', async () => {
    await seedLanguage('latin', { active: false });

    const res = await api('GET', '/lang/random');

    expect(res.status).toBe(404);
  });

  test('is not mistaken for a language id', async () => {
    await seedLanguage('spanish');

    const res = await api('GET', '/lang/random');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('spanish');
  });

  test('only picks active languages', async () => {
    await seedLanguage('spanish', { active: true });
    await seedLanguage('latin', { active: false });
    await seedLanguage('gothic', { active: false });

    for (let i = 0; i < 10; i++) {
      const res = await api('GET', '/lang/random');
      expect(res.body.id).toBe('spanish');
    }
  });
});

describe('PUT /lang/:id', () => {
  test('requires a session', async () => {
    await seedLanguage('spanish');

    const res = await api('PUT', '/lang/spanish', { body: newData });

    expect(res.status).toBe(401);
  });

  test('answers 404 for a language that does not exist', async () => {
    const { token } = await createTestAdmin();

    const res = await api('PUT', '/lang/klingon', { token, body: newData });

    expect(res.status).toBe(404);
  });

  test('forbids a user without permission over that language', async () => {
    await seedLanguage('spanish', { name: 'Spanish' });
    const { token } = await createTestUser();

    const res = await api('PUT', '/lang/spanish', { token, body: newData });

    expect(res.status).toBe(403);
    expect(res.body.key).toBe('notAllowed');
    expect((await getStoredLanguage('spanish'))?.features).toEqual([]);
  });

  test('forbids a permission over a different language', async () => {
    await seedLanguage('spanish');
    await seedLanguage('basque');
    const { user, token } = await createTestUser();
    await grantPermission(user.id, 'basque');

    const res = await api('PUT', '/lang/spanish', { token, body: newData });

    expect(res.status).toBe(403);
  });

  test('lets an administrator replace the data of any language', async () => {
    await seedLanguage('spanish');
    const { token } = await createTestAdmin();

    const res = await api('PUT', '/lang/spanish', { token, body: newData });

    expect(res.status).toBe(200);
    expect(res.body.key).toBe('success');
    expect(await getStoredLanguage('spanish')).toEqual(newData);
  });

  test('lets a user with permission replace that language', async () => {
    await seedLanguage('spanish');
    const { user, token } = await createTestUser();
    await grantPermission(user.id, 'spanish');

    const res = await api('PUT', '/lang/spanish', { token, body: newData });

    expect(res.status).toBe(200);
    expect(await getStoredLanguage('spanish')).toEqual(newData);
  });

  test('replaces the document instead of merging it', async () => {
    await seedLanguage('spanish', { exonym: 'Español', searchParams: ['x'] });
    const { token } = await createTestAdmin();
    const { exonym: _, ...withoutExonym } = newData;

    await api('PUT', '/lang/spanish', {
      token,
      body: { ...withoutExonym, searchParams: [] },
    });

    const stored = await getStoredLanguage('spanish');
    expect(stored).not.toHaveProperty('exonym');
    expect(stored?.searchParams).toEqual([]);
  });

  test('the edit is visible through the catalogue and the search', async () => {
    await seedLanguage('spanish');
    const { token } = await createTestAdmin();

    await api('PUT', '/lang/spanish', { token, body: newData });

    const one = await api('GET', '/lang/spanish');
    const all = await api('GET', '/lang');
    expect(one.body).toEqual({ id: 'spanish', ...newData });
    expect(all.body[0]).toEqual({ id: 'spanish', ...newData });
  });

  test.each([
    ['an unknown feature', { features: ['notAFeature'] }],
    ['an unknown partial feature', { partial: ['notAFeature'] }],
    ['an empty name', { name: '' }],
    ['a missing active flag', { active: undefined }],
    ['features that are not a list', { features: 'svo' }],
  ])('rejects %s', async (_, override) => {
    await seedLanguage('spanish');
    const { token } = await createTestAdmin();

    const res = await api('PUT', '/lang/spanish', {
      token,
      body: { ...newData, ...override },
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidData');
    expect((await getStoredLanguage('spanish'))?.features).toEqual([]);
  });

  test('rejects a body that is not JSON', async () => {
    await seedLanguage('spanish');
    const { token } = await createTestAdmin();

    const res = await api('PUT', '/lang/spanish', { token, rawBody: '{' });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidBody');
  });
});

describe('PUT /lang/:id/status', () => {
  test('requires a session', async () => {
    await seedLanguage('spanish');

    const res = await api('PUT', '/lang/spanish/status', {
      query: { active: 'false' },
    });

    expect(res.status).toBe(401);
  });

  test('is only for administrators', async () => {
    await seedLanguage('spanish');
    const { user, token } = await createTestUser();
    await grantPermission(user.id, 'spanish');

    const res = await api('PUT', '/lang/spanish/status', {
      token,
      query: { active: 'false' },
    });

    expect(res.status).toBe(403);
    expect(res.body.key).toBe('noAdmin');
    expect((await getStoredLanguage('spanish'))?.active).toBe(true);
  });

  test.each([
    ['missing', undefined],
    ['1', '1'],
    ['yes', 'yes'],
  ])('rejects an active flag that is %s', async (_, active) => {
    await seedLanguage('spanish');
    const { token } = await createTestAdmin();

    const res = await api('PUT', '/lang/spanish/status', {
      token,
      query: active === undefined ? {} : { active },
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('notActive');
  });

  test('answers 404 for a language that does not exist', async () => {
    const { token } = await createTestAdmin();

    const res = await api('PUT', '/lang/klingon/status', {
      token,
      query: { active: 'true' },
    });

    expect(res.status).toBe(404);
  });

  test('deactivates and reactivates a language', async () => {
    await seedLanguage('spanish', { features: ['svo'] });
    const { token } = await createTestAdmin();

    const off = await api('PUT', '/lang/spanish/status', {
      token,
      query: { active: 'false' },
    });
    expect(off.body).toEqual({ success: true, lang: 'spanish' });
    expect((await getStoredLanguage('spanish'))?.active).toBe(false);

    await api('PUT', '/lang/spanish/status', {
      token,
      query: { active: 'true' },
    });
    expect(await getStoredLanguage('spanish')).toMatchObject({
      active: true,
      features: ['svo'],
    });
  });

  test('a deactivated language leaves the playable catalogue', async () => {
    await seedLanguage('spanish');
    await seedLanguage('basque');
    const { token } = await createTestAdmin();

    await api('PUT', '/lang/spanish/status', {
      token,
      query: { active: 'false' },
    });

    const playable = await api('GET', '/lang', { query: { oactive: '1' } });
    const random = await api('GET', '/lang/random');
    expect(playable.body.map((lang: { id: string }) => lang.id)).toEqual([
      'basque',
    ]);
    expect(random.body.id).toBe('basque');
  });
});
