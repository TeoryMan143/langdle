import { describe, expect, test } from 'vitest';
import { getClient } from '@/core/database/redis/config';
import { forwardClientHeaders } from '@/core/lib/client-info';
import { GAME_LOG_TTL_S } from '@/modules/game-logs/service';
import { api } from '../support/api';
import { createTestAdmin, createTestUser } from '../support/factories';

const today = () => new Date().toISOString().slice(0, 10);

const startEvent = {
  event: 'start',
  gameId: 'game-1',
  type: 'daily',
  targetLang: 'spanish',
  attempt: 0,
};

async function storedLogs(date = today()) {
  const client = await getClient();
  const entries = await client.xRange(`gamelog:${date}`, '-', '+');
  return entries.map(({ message }) => JSON.parse(message.data));
}

describe('POST /logs/game', () => {
  test('logs a signed out player with the request headers', async () => {
    const res = await api('POST', '/logs/game', {
      body: {
        ...startEvent,
        visitorId: 'visitor-1',
        client: { platform: 'web', locale: 'es', languages: ['es-CO', 'en'] },
      },
      headers: {
        'X-Forwarded-For': '203.0.113.7, 10.0.0.1',
        'User-Agent': 'Mozilla/5.0 Test',
        'Accept-Language': 'es-CO,es;q=0.9',
        'X-Vercel-IP-Country': 'CO',
        'X-Vercel-IP-City': 'Bogot%C3%A1',
        'X-Vercel-IP-Latitude': '4.61',
        'X-Vercel-IP-Longitude': '-74.08',
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^\d+-\d+$/);

    const [log] = await storedLogs();

    expect(log).toMatchObject({
      ...startEvent,
      visitorId: 'visitor-1',
      client: { platform: 'web', locale: 'es', languages: ['es-CO', 'en'] },
      user: null,
      request: {
        ip: '203.0.113.7',
        userAgent: 'Mozilla/5.0 Test',
        acceptLanguage: 'es-CO,es;q=0.9',
        country: 'CO',
        city: 'Bogotá',
        latitude: 4.61,
        longitude: -74.08,
      },
    });
    expect(Date.parse(log.at)).not.toBeNaN();
  });

  test('logs who the player is when the request is signed', async () => {
    const { user, token } = await createTestUser({ country: 'BR' });

    const res = await api('POST', '/logs/game', {
      token,
      body: {
        ...startEvent,
        event: 'guess',
        guessLang: 'portuguese',
        attempt: 1,
      },
    });

    expect(res.status).toBe(201);
    expect(res.headers.get('X-Session-Expires-At')).toBeTruthy();

    const [log] = await storedLogs();

    expect(log.user).toEqual({
      id: user.id,
      nickname: user.nickname,
      email: user.email,
      country: 'BR',
      admin: false,
    });
    expect(log).toMatchObject({ guessLang: 'portuguese', attempt: 1 });
  });

  test('logs an invalid session as a signed out player', async () => {
    const res = await api('POST', '/logs/game', {
      token: 'not-a-session',
      body: startEvent,
    });

    expect(res.status).toBe(201);
    expect((await storedLogs())[0].user).toBeNull();
  });

  test('trusts the forwarded browser headers of a server action', async () => {
    const browser: Record<string, string> = {
      'x-forwarded-for': '198.51.100.4',
      'user-agent': 'Browser UA',
    };

    const res = await api('POST', '/logs/game', {
      body: startEvent,
      headers: {
        'X-Forwarded-For': '10.0.0.9',
        'User-Agent': 'node',
        ...forwardClientHeaders(name => browser[name]),
      },
    });

    expect(res.status).toBe(201);
    expect((await storedLogs())[0].request).toMatchObject({
      ip: '198.51.100.4',
      userAgent: 'Browser UA',
    });
  });

  test('ignores forwarded headers without the right key', async () => {
    const res = await api('POST', '/logs/game', {
      body: startEvent,
      headers: {
        'X-Forwarded-For': '10.0.0.9',
        'x-langdle-forward-key': 'guessed',
        'x-langdle-client-x-forwarded-for': '198.51.100.4',
      },
    });

    expect(res.status).toBe(201);
    expect((await storedLogs())[0].request.ip).toBe('10.0.0.9');
  });

  test('keeps a day of logs for the retention period', async () => {
    await api('POST', '/logs/game', { body: startEvent });

    const client = await getClient();
    const ttl = await client.ttl(`gamelog:${today()}`);

    expect(ttl).toBeGreaterThan(GAME_LOG_TTL_S - 60);
    expect(ttl).toBeLessThanOrEqual(GAME_LOG_TTL_S);
  });

  test('rejects an unknown event and a guess without its language', async () => {
    const unknown = await api('POST', '/logs/game', {
      body: { ...startEvent, event: 'quit' },
    });
    const guess = await api('POST', '/logs/game', {
      body: { ...startEvent, event: 'guess' },
    });

    expect(unknown.status).toBe(400);
    expect(guess.status).toBe(400);
    expect(guess.body.errors.fieldErrors.guessLang).toBeDefined();
    expect(await storedLogs()).toEqual([]);
  });
});

describe('GET /logs/game', () => {
  test('is for administrators only', async () => {
    const { token } = await createTestUser();

    const anonymous = await api('GET', '/logs/game');
    const user = await api('GET', '/logs/game', { token });

    expect(anonymous.status).toBe(401);
    expect(user.status).toBe(403);
  });

  test('reads a day newest first, a batch at a time', async () => {
    const { token } = await createTestAdmin();

    for (const gameId of ['a', 'b', 'c']) {
      await api('POST', '/logs/game', { body: { ...startEvent, gameId } });
    }

    const first = await api('GET', '/logs/game', {
      token,
      query: { limit: '2' },
    });

    expect(first.status).toBe(200);
    expect(
      first.body.items.map((log: { gameId: string }) => log.gameId),
    ).toEqual(['c', 'b']);
    expect(first.body.nextCursor).toBe(first.body.items[1].id);

    const second = await api('GET', '/logs/game', {
      token,
      query: { limit: '2', cursor: first.body.nextCursor },
    });

    expect(
      second.body.items.map((log: { gameId: string }) => log.gameId),
    ).toEqual(['a']);
    expect(second.body.nextCursor).toBeNull();
    expect(first.body.total).toBe(3);
    expect(second.body.total).toBe(3);
  });

  test('answers an empty day and rejects a bad query', async () => {
    const { token } = await createTestAdmin();

    const empty = await api('GET', '/logs/game', {
      token,
      query: { date: '2020-01-01' },
    });
    const bad = await api('GET', '/logs/game', {
      token,
      query: { cursor: 'nope' },
    });

    expect(empty.body).toEqual({ items: [], nextCursor: null, total: 0 });
    expect(bad.status).toBe(400);
  });
});

describe('DELETE /auth/me', () => {
  test('erases the logs of the deleted user, and only theirs', async () => {
    const leaving = await createTestUser();
    const staying = await createTestUser();

    // An older day still kept, to check every retained day is swept.
    const client = await getClient();
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    await client.xAdd(`gamelog:${lastWeek}`, '*', {
      data: JSON.stringify({ ...startEvent, user: { id: leaving.user.id } }),
    });

    await api('POST', '/logs/game', { token: leaving.token, body: startEvent });
    await api('POST', '/logs/game', { token: staying.token, body: startEvent });
    await api('POST', '/logs/game', { body: startEvent });

    const res = await api('DELETE', '/auth/me', { token: leaving.token });

    expect(res.status).toBe(200);
    expect(
      (await storedLogs()).map(
        (log: { user: { id: string } | null }) => log.user?.id ?? null,
      ),
    ).toEqual([staying.user.id, null]);
    expect(await storedLogs(lastWeek)).toEqual([]);
  });
});
