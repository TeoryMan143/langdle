import { describe, expect, test } from 'vitest';
import { getClient } from '@/core/database/redis/config';
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

  test('lists every language past a single search page', async () => {
    const ids = Array.from(
      { length: 1050 },
      (_, i) => `l${String(i).padStart(4, '0')}`,
    );

    const client = await getClient();
    await Promise.all(
      ids.map(id =>
        client.json.set(`lang:${id}`, '$', {
          name: id,
          active: false,
          features: [],
          partial: [],
          searchParams: [],
        }),
      ),
    );

    const res = await api('GET', '/lang');

    expect(res.status).toBe(200);
    expect(res.body.map((lang: { id: string }) => lang.id)).toEqual(ids);
  });

  test('lists the place, family and coverage of a language', async () => {
    await seedLanguage('basque', {
      locations: [{ lat: 43, lng: -3 }],
      family: 'Basque',
      genus: 'Basque',
      coverage: 0.8,
    });
    await seedLanguage('spanish');

    const res = await api('GET', '/lang');

    expect(res.body[0]).toMatchObject({
      id: 'basque',
      locations: [{ lat: 43, lng: -3 }],
      family: 'Basque',
      genus: 'Basque',
      coverage: 0.8,
    });
    expect(res.body[1]).not.toHaveProperty('locations');
    expect(res.body[1]).not.toHaveProperty('coverage');
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

  test('answers the language it stored', async () => {
    await seedLanguage('spanish');
    const { token } = await createTestAdmin();

    const res = await api('PUT', '/lang/spanish', { token, body: newData });
    const read = await api('GET', '/lang/spanish');

    expect(res.status).toBe(200);
    expect(res.body.language).toEqual(read.body);
  });

  test('keeps the stored place, family and coverage a body leaves out', async () => {
    const managed = {
      locations: [{ lat: 40, lng: -4 }],
      family: 'Indo-European',
      genus: 'Romance',
      coverage: 0.5,
    };
    await seedLanguage('spanish', managed);
    const { token } = await createTestAdmin();

    const res = await api('PUT', '/lang/spanish', { token, body: newData });

    expect(res.status).toBe(200);
    expect(await getStoredLanguage('spanish')).toEqual({
      ...newData,
      ...managed,
    });
  });

  test('removes the place and family a body sets to null', async () => {
    await seedLanguage('spanish', {
      locations: [{ lat: 40, lng: -4 }],
      family: 'Indo-European',
      genus: 'Romance',
      coverage: 0.5,
    });
    const { token } = await createTestAdmin();

    const res = await api('PUT', '/lang/spanish', {
      token,
      body: { ...newData, locations: null, family: null, genus: null },
    });

    expect(res.status).toBe(200);
    expect(await getStoredLanguage('spanish')).toEqual({
      ...newData,
      coverage: 0.5,
    });
  });

  test('rejects a location off the globe', async () => {
    await seedLanguage('spanish');
    const { token } = await createTestAdmin();

    const res = await api('PUT', '/lang/spanish', {
      token,
      body: { ...newData, locations: [{ lat: 91, lng: 0 }] },
    });

    expect(res.status).toBe(400);
  });

  test('replaces the place and family a body sends', async () => {
    await seedLanguage('spanish', { family: 'Wrong', genus: 'Wrong' });
    const { token } = await createTestAdmin();

    const res = await api('PUT', '/lang/spanish', {
      token,
      body: { ...newData, family: 'Indo-European', genus: 'Romance' },
    });

    expect(res.status).toBe(200);
    expect(await getStoredLanguage('spanish')).toMatchObject({
      family: 'Indo-European',
      genus: 'Romance',
    });
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

describe('GET /lang/page', () => {
  const ids = (body: { items: Array<{ id: string }> }) =>
    body.items.map(lang => lang.id);

  test('answers an empty last batch while the catalogue is empty', async () => {
    const res = await api('GET', '/lang/page');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], nextCursor: null, total: 0 });
  });

  test('walks the catalogue by name, batch by batch', async () => {
    for (const [id, name] of [
      ['zulu', 'Zulu'],
      ['arabic', 'arabic'],
      ['basque', 'Basque'],
      ['catalan', 'Catalan'],
      ['dutch', 'Dutch'],
    ]) {
      await seedLanguage(id, { name });
    }

    const first = await api('GET', '/lang/page', { query: { limit: '2' } });
    expect(first.status).toBe(200);
    expect(ids(first.body)).toEqual(['arabic', 'basque']);
    expect(first.body.total).toBe(5);
    expect(first.body.nextCursor).toEqual(expect.any(String));

    const second = await api('GET', '/lang/page', {
      query: { limit: '2', cursor: first.body.nextCursor },
    });
    expect(ids(second.body)).toEqual(['catalan', 'dutch']);

    const last = await api('GET', '/lang/page', {
      query: { limit: '2', cursor: second.body.nextCursor },
    });
    expect(ids(last.body)).toEqual(['zulu']);
    expect(last.body.nextCursor).toBeNull();
  });

  test('sends whole languages, features and place included', async () => {
    await seedLanguage('basque', {
      features: ['sov'],
      partial: ['tense'],
      locations: [{ lat: 43, lng: -3 }],
      family: 'Basque',
    });

    const res = await api('GET', '/lang/page');

    expect(res.body.items[0]).toMatchObject({
      id: 'basque',
      features: ['sov'],
      partial: ['tense'],
      locations: [{ lat: 43, lng: -3 }],
      family: 'Basque',
    });
  });

  test('a language added or removed before the cursor never shifts the next batch', async () => {
    for (const id of ['b', 'd', 'f', 'h']) {
      await seedLanguage(id);
    }

    const first = await api('GET', '/lang/page', { query: { limit: '2' } });
    expect(ids(first.body)).toEqual(['b', 'd']);

    await seedLanguage('a');
    await (await getClient()).del('lang:b');

    const second = await api('GET', '/lang/page', {
      query: { limit: '2', cursor: first.body.nextCursor },
    });
    expect(ids(second.body)).toEqual(['f', 'h']);
  });

  test('orders languages with the same name by id', async () => {
    await seedLanguage('quechua-b', { name: 'Quechua' });
    await seedLanguage('quechua-a', { name: 'Quechua' });

    const first = await api('GET', '/lang/page', { query: { limit: '1' } });
    const second = await api('GET', '/lang/page', {
      query: { limit: '1', cursor: first.body.nextCursor },
    });

    expect([...ids(first.body), ...ids(second.body)]).toEqual([
      'quechua-a',
      'quechua-b',
    ]);
  });

  test('sends 24 languages per batch by default', async () => {
    const client = await getClient();
    await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        client.json.set(`lang:l${String(i).padStart(2, '0')}`, '$', {
          name: `l${String(i).padStart(2, '0')}`,
          active: false,
          features: [],
          partial: [],
          searchParams: [],
        }),
      ),
    );

    const res = await api('GET', '/lang/page');

    expect(res.body.items).toHaveLength(24);
    expect(res.body.total).toBe(30);
  });

  test('keeps the playable or the unplayable languages with ?active=', async () => {
    await seedLanguage('spanish');
    await seedLanguage('basque', { active: false });

    const playable = await api('GET', '/lang/page', {
      query: { active: 'true' },
    });
    const unplayable = await api('GET', '/lang/page', {
      query: { active: 'false' },
    });

    expect(ids(playable.body)).toEqual(['spanish']);
    expect(playable.body.total).toBe(1);
    expect(ids(unplayable.body)).toEqual(['basque']);
  });

  test('lists the best described languages first with ?sort=coverage', async () => {
    await seedLanguage('ainu', { coverage: 0.2 });
    await seedLanguage('basque', { coverage: 0.9 });
    await seedLanguage('cree');
    await seedLanguage('dogon', { coverage: 0.2 });

    const first = await api('GET', '/lang/page', {
      query: { sort: 'coverage', limit: '2' },
    });
    const second = await api('GET', '/lang/page', {
      query: { sort: 'coverage', limit: '2', cursor: first.body.nextCursor },
    });

    expect([...ids(first.body), ...ids(second.body)]).toEqual([
      'basque',
      'ainu',
      'dogon',
      'cree',
    ]);
  });

  test('keeps the languages whose id or names contain ?q=', async () => {
    await seedLanguage('spanish', { name: 'Spanish', exonym: 'Español' });
    await seedLanguage('basque', {
      name: 'Basque',
      exonym: 'Euskara',
      searchParams: ['vasco'],
    });
    await seedLanguage('catalan', { name: 'Catalan', exonym: 'Català' });

    const byExonym = await api('GET', '/lang/page', {
      query: { q: 'ESPA' },
    });
    const bySearchParam = await api('GET', '/lang/page', {
      query: { q: 'vasc' },
    });
    const byId = await api('GET', '/lang/page', { query: { q: 'catal' } });

    expect(ids(byExonym.body)).toEqual(['spanish']);
    expect(byExonym.body.total).toBe(1);
    expect(ids(bySearchParam.body)).toEqual(['basque']);
    expect(ids(byId.body)).toEqual(['catalan']);
  });

  test('matches ?q= without accents', async () => {
    await seedLanguage('catalan', { name: 'Catalan', exonym: 'Català' });
    await seedLanguage('spanish', { name: 'Spanish', exonym: 'Español' });

    const res = await api('GET', '/lang/page', { query: { q: 'espanol' } });

    expect(ids(res.body)).toEqual(['spanish']);
  });

  test('lists the best matches of ?q= first, and pages through them', async () => {
    await seedLanguage('aleut', { name: 'Aleut' });
    await seedLanguage('ale', { name: 'Ale' });
    await seedLanguage('kale', { name: 'Kale' });
    await seedLanguage('old-ale', { name: 'Old Ale' });
    await seedLanguage('zulu', { name: 'Zulu' });

    const first = await api('GET', '/lang/page', {
      query: { q: 'ale', limit: '2' },
    });
    const second = await api('GET', '/lang/page', {
      query: { q: 'ale', limit: '2', cursor: first.body.nextCursor },
    });

    expect(first.body.total).toBe(4);
    expect([...ids(first.body), ...ids(second.body)]).toEqual([
      'ale',
      'aleut',
      'old-ale',
      'kale',
    ]);
    expect(second.body.nextCursor).toBeNull();
  });

  test('sees a language edited through the API at once', async () => {
    await seedLanguage('spanish', { active: false });
    const { token } = await createTestAdmin();

    const before = await api('GET', '/lang/page', {
      query: { active: 'false' },
    });
    await api('PUT', '/lang/spanish/status', {
      token,
      query: { active: 'true' },
    });
    const after = await api('GET', '/lang/page', {
      query: { active: 'false' },
    });

    expect(ids(before.body)).toEqual(['spanish']);
    expect(ids(after.body)).toEqual([]);
  });

  test('rejects a cursor it did not make', async () => {
    const res = await api('GET', '/lang/page', {
      query: { cursor: 'not-a-cursor' },
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidCursor');
  });

  test.each<Record<string, string>>([
    { limit: '0' },
    { limit: '101' },
    { limit: 'many' },
    { active: '1' },
    { sort: 'random' },
  ])('rejects %o', async query => {
    const res = await api('GET', '/lang/page', { query });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidData');
  });
});

describe('GET /lang/summary', () => {
  test('counts the languages and their features', async () => {
    await seedLanguage('spanish', {
      features: ['svo', 'tense'],
      partial: ['aspect'],
    });
    await seedLanguage('basque', { active: false, features: ['sov'] });

    const res = await api('GET', '/lang/summary');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      languages: 2,
      activeLanguages: 1,
      activeFeatures: 3,
      partialFeatures: 1,
    });
  });
});

describe('GET /lang/names', () => {
  test('lists the names of every language by name, without features', async () => {
    await seedLanguage('spanish', {
      name: 'Spanish',
      exonym: 'Español',
      features: ['svo'],
      searchParams: ['castellano'],
    });
    await seedLanguage('basque', { name: 'Basque', active: false });

    const res = await api('GET', '/lang/names');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 'basque', name: 'Basque', exonym: 'basque', searchParams: [] },
      {
        id: 'spanish',
        name: 'Spanish',
        exonym: 'Español',
        searchParams: ['castellano'],
      },
    ]);
  });

  test('keeps the playable languages with ?active=true', async () => {
    await seedLanguage('spanish');
    await seedLanguage('basque', { active: false });

    const res = await api('GET', '/lang/names', { query: { active: 'true' } });

    expect(res.body.map((lang: { id: string }) => lang.id)).toEqual([
      'spanish',
    ]);
  });

  test('rejects ?active=1', async () => {
    const res = await api('GET', '/lang/names', { query: { active: '1' } });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidData');
  });
});

describe('GET /lang/page?q= with typos', () => {
  test('finds a language despite a typo, after the exact matches', async () => {
    await seedLanguage('spanish', { name: 'Spanish' });
    await seedLanguage('spanglish', { name: 'Spanglish' });

    const res = await api('GET', '/lang/page', { query: { q: 'spanich' } });

    expect(res.body.items.map((lang: { id: string }) => lang.id)).toEqual([
      'spanish',
    ]);
  });

  test('takes two letters swapped for a single typo', async () => {
    await seedLanguage('spanish', { name: 'Spanish' });

    const res = await api('GET', '/lang/page', { query: { q: 'spanihs' } });

    expect(res.body.items.map((lang: { id: string }) => lang.id)).toEqual([
      'spanish',
    ]);
  });
});
