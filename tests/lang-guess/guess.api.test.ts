import { describe, expect, test } from 'vitest';
import { getClient } from '@/core/database/redis/config';
import { api, cronHeaders } from '../support/api';
import {
  createTestUser,
  seedHistory,
  seedLanguage,
} from '../support/factories';

async function setDaily(id: string) {
  const client = await getClient();
  await client.set('daylang', id);
}

async function getDaily() {
  const client = await getClient();
  return client.get('daylang');
}

describe('GET /guess/daily', () => {
  test('answers the language of the day', async () => {
    await seedLanguage('spanish', { name: 'Spanish', features: ['svo'] });
    await setDaily('spanish');

    const res = await api('GET', '/guess/daily');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 'spanish',
      name: 'Spanish',
      features: ['svo'],
    });
  });

  test('fails while no language was rolled yet', async () => {
    const res = await api('GET', '/guess/daily');

    expect(res.status).toBe(500);
  });

  test('fails when the language of the day was deleted', async () => {
    await setDaily('klingon');

    const res = await api('GET', '/guess/daily');

    expect(res.status).toBe(500);
  });
});

describe('GET /guess/jobs/daily', () => {
  test('requires the cron secret', async () => {
    await seedLanguage('spanish');

    const missing = await api('GET', '/guess/jobs/daily');
    const wrong = await api('GET', '/guess/jobs/daily', {
      headers: { Authorization: 'Bearer nope' },
    });

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(await getDaily()).toBeNull();
  });

  test('rolls an active language as the language of the day', async () => {
    await seedLanguage('spanish');

    const res = await api('GET', '/guess/jobs/daily', {
      headers: cronHeaders,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, lang: 'spanish' });
    expect(await getDaily()).toBe('spanish');
    expect((await api('GET', '/guess/daily')).body.id).toBe('spanish');
  });

  test('never picks an inactive language', async () => {
    await seedLanguage('spanish', { active: true });
    await seedLanguage('latin', { active: false });

    for (let i = 0; i < 10; i++) {
      await api('GET', '/guess/jobs/daily', { headers: cronHeaders });
      expect(await getDaily()).toBe('spanish');
    }
  });

  test('fails when there is nothing to pick from and keeps the old one', async () => {
    await seedLanguage('latin', { active: false });
    await setDaily('latin');

    const res = await api('GET', '/guess/jobs/daily', {
      headers: cronHeaders,
    });

    expect(res.status).toBe(500);
    expect(await getDaily()).toBe('latin');
  });

  test('the new language replaces the previous one', async () => {
    await seedLanguage('spanish', { active: false });
    await seedLanguage('basque', { active: true });
    await setDaily('spanish');

    await api('GET', '/guess/jobs/daily', { headers: cronHeaders });

    expect(await getDaily()).toBe('basque');
  });
});

describe('GET /guess/:id', () => {
  test('a wrong guess answers how its features compare, not the target', async () => {
    await seedLanguage('spanish', {
      features: ['svo', 'tense', 'latinAlphabet'],
      partial: ['aspect'],
    });
    await seedLanguage('basque', {
      name: 'Basque',
      features: ['sov', 'tense', 'latinAlphabet'],
      partial: ['aspect'],
    });
    await setDaily('spanish');

    const res = await api('GET', '/guess/basque');

    expect(res.status).toBe(200);
    expect(res.body.correct.sort()).toEqual(['latinAlphabet', 'tense']);
    expect(res.body.incorrect).toEqual(['sov']);
    expect(res.body.partial).toEqual(['aspect']);
    expect(res.body).not.toHaveProperty('guessed');
    expect(res.text).not.toContain('svo');
  });

  test('the right guess answers the whole target', async () => {
    await seedLanguage('spanish', { name: 'Spanish', features: ['svo'] });
    await setDaily('spanish');

    const res = await api('GET', '/guess/spanish');

    expect(res.status).toBe(200);
    expect(res.body.guessed).toMatchObject({
      id: 'spanish',
      name: 'Spanish',
      features: ['svo'],
    });
  });

  test('answers 404 for a language that does not exist', async () => {
    await seedLanguage('spanish');
    await setDaily('spanish');

    const res = await api('GET', '/guess/klingon');

    expect(res.status).toBe(404);
    expect(res.body.key).toBe('notFound');
  });

  test('?target= compares against another language, for random games', async () => {
    await seedLanguage('spanish', { features: ['svo'] });
    await seedLanguage('basque', { features: ['sov'] });
    await seedLanguage('zulu', { features: ['svo'] });
    await setDaily('zulu');

    const wrong = await api('GET', '/guess/basque', {
      query: { target: 'spanish' },
    });
    const right = await api('GET', '/guess/spanish', {
      query: { target: 'spanish' },
    });

    expect(wrong.body).toEqual({
      correct: [],
      incorrect: ['sov'],
      partial: [],
    });
    expect(right.body.guessed.id).toBe('spanish');
  });

  test('?target=daily means the language of the day', async () => {
    await seedLanguage('spanish');
    await seedLanguage('basque');
    await setDaily('spanish');

    const res = await api('GET', '/guess/spanish', {
      query: { target: 'daily' },
    });

    expect(res.body.guessed.id).toBe('spanish');
  });

  test('answers 404 for a target that does not exist', async () => {
    await seedLanguage('spanish');

    const res = await api('GET', '/guess/spanish', {
      query: { target: 'klingon' },
    });

    expect(res.status).toBe(404);
  });

  test('a guess in a random game does not need a language of the day', async () => {
    await seedLanguage('spanish');
    await seedLanguage('basque');

    const res = await api('GET', '/guess/basque', {
      query: { target: 'spanish' },
    });

    expect(res.status).toBe(200);
  });

  test('inactive languages can still be guessed', async () => {
    await seedLanguage('spanish', { features: ['svo'] });
    await seedLanguage('latin', { active: false, features: ['svo'] });
    await setDaily('spanish');

    const res = await api('GET', '/guess/latin');

    expect(res.status).toBe(200);
    expect(res.body.correct).toEqual(['svo']);
  });
});

describe('GET /guess/history', () => {
  test('requires a session', async () => {
    const res = await api('GET', '/guess/history');

    expect(res.status).toBe(401);
  });

  test('is empty for a new player', async () => {
    const { token } = await createTestUser();

    const res = await api('GET', '/guess/history', { token });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('lists only the games of the caller, most recent first', async () => {
    const me = await createTestUser();
    const other = await createTestUser();
    const old = await seedHistory(me.user.id, { date: '2026-01-01' });
    const recent = await seedHistory(me.user.id, { date: '2026-03-01' });
    await seedHistory(other.user.id);

    const res = await api('GET', '/guess/history', { token: me.token });

    expect(res.body.map((game: { id: string }) => game.id)).toEqual([
      recent.id,
      old.id,
    ]);
    expect(
      res.body.every((game: { userId: string }) => game.userId === me.user.id),
    ).toBe(true);
  });
});

describe('PUT /guess/history', () => {
  const game = {
    type: 'daily',
    targetLang: 'spanish',
    guesses: 4,
    guessed: true,
  };

  test('requires a session', async () => {
    const res = await api('PUT', '/guess/history', { body: game });

    expect(res.status).toBe(401);
  });

  test('stores the finished game for the caller', async () => {
    const { user, token } = await createTestUser();

    const res = await api('PUT', '/guess/history', { token, body: game });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ...game, userId: user.id });
    expect(res.body.date).toBe(new Date().toISOString().slice(0, 10));

    const history = await api('GET', '/guess/history', { token });
    expect(history.body).toHaveLength(1);
    expect(history.body[0].id).toBe(res.body.id);
  });

  test('stores a lost random game', async () => {
    const { token } = await createTestUser();

    const res = await api('PUT', '/guess/history', {
      token,
      body: {
        type: 'random',
        targetLang: 'basque',
        guesses: 10,
        guessed: false,
      },
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ type: 'random', guessed: false });
  });

  test('the client cannot write on behalf of another user', async () => {
    const me = await createTestUser();
    const other = await createTestUser();

    await api('PUT', '/guess/history', {
      token: me.token,
      body: { ...game, userId: other.user.id },
    });

    const mine = await api('GET', '/guess/history', { token: me.token });
    const theirs = await api('GET', '/guess/history', { token: other.token });
    expect(mine.body).toHaveLength(1);
    expect(theirs.body).toHaveLength(0);
  });

  test.each([
    ['an unknown type', { type: 'weekly' }],
    ['negative guesses', { guesses: -1 }],
    ['guesses that are not a number', { guesses: 'four' }],
    ['no target', { targetLang: undefined }],
    ['no result', { guessed: undefined }],
  ])('rejects %s', async (_, override) => {
    const { token } = await createTestUser();

    const res = await api('PUT', '/guess/history', {
      token,
      body: { ...game, ...override },
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidData');
    expect((await api('GET', '/guess/history', { token })).body).toEqual([]);
  });

  test('rejects a body that is not JSON', async () => {
    const { token } = await createTestUser();

    const res = await api('PUT', '/guess/history', { token, rawBody: '{' });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidBody');
  });
});
