import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { describe, expect, test, vi } from 'vitest';
import { getClient } from '@/core/database/redis/config';
import { db } from '@/core/database/relational/config';
import { sessionTable, userTable } from '@/core/database/relational/tables';
import { SESSION_DURATION_MS } from '@/core/lib/session-config';
import { google } from '@/modules/auth/service';
import { api } from '../support/api';
import { createTestUser, PASSWORD, seedLanguage } from '../support/factories';

const signUpBody = {
  nickname: 'ana',
  email: 'ana@langdle.test',
  country: 'ES',
  password: 'password123',
  confirmPassword: 'password123',
};

const HOUR = 1000 * 60 * 60;
const DAY = 24 * HOUR;

describe('POST /auth/signup', () => {
  test('creates the user and opens a session', async () => {
    const res = await api('POST', '/auth/signup', { body: signUpBody });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      nickname: 'ana',
      email: 'ana@langdle.test',
      country: 'ES',
      admin: false,
      googleId: null,
    });
    expect(res.body.token).toEqual(expect.any(String));
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const me = await api('GET', '/auth/me', { token: res.body.token });
    expect(me.status).toBe(200);
    expect(me.body.id).toBe(res.body.user.id);
  });

  test('never answers the password', async () => {
    const res = await api('POST', '/auth/signup', { body: signUpBody });

    expect(res.body.user).not.toHaveProperty('password');
    expect(res.text).not.toContain('password123');
  });

  test('stores an argon2 hash, not the password', async () => {
    await api('POST', '/auth/signup', { body: signUpBody });

    const [stored] = await db.select().from(userTable);

    expect(stored.password).not.toBe('password123');
    expect(stored.password).toMatch(/^\$argon2/);
    expect(await argon2.verify(stored.password as string, 'password123')).toBe(
      true,
    );
  });

  test('stores only the hash of the session token', async () => {
    const res = await api('POST', '/auth/signup', { body: signUpBody });

    const [session] = await db.select().from(sessionTable);

    expect(session.userId).toBe(res.body.user.id);
    expect(session.id).not.toBe(res.body.token);
    expect(session.id).toMatch(/^[0-9a-f]{64}$/);
  });

  test('the session lasts thirty days', async () => {
    const res = await api('POST', '/auth/signup', { body: signUpBody });

    const [session] = await db.select().from(sessionTable);
    const remaining = session.expiresAt.getTime() - Date.now();

    expect(res.status).toBe(201);
    expect(remaining).toBeGreaterThan(SESSION_DURATION_MS - HOUR);
    expect(remaining).toBeLessThanOrEqual(SESSION_DURATION_MS);
  });

  test('a client cannot make itself administrator', async () => {
    const res = await api('POST', '/auth/signup', {
      body: { ...signUpBody, admin: true, googleId: 'x', fluent: 'es' },
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      admin: false,
      googleId: null,
      fluent: null,
    });
  });

  test('trims the nickname', async () => {
    const res = await api('POST', '/auth/signup', {
      body: { ...signUpBody, nickname: '  ana  ' },
    });

    expect(res.status).toBe(201);
    expect(res.body.user.nickname).toBe('ana');
  });

  test('rejects a nickname that is already taken', async () => {
    await api('POST', '/auth/signup', { body: signUpBody });

    const res = await api('POST', '/auth/signup', {
      body: { ...signUpBody, email: 'other@langdle.test' },
    });

    expect(res.status).toBe(409);
    expect(res.body.key).toBe('nicknameAlreadyExists');
  });

  test('rejects an email that is already registered', async () => {
    await api('POST', '/auth/signup', { body: signUpBody });

    const res = await api('POST', '/auth/signup', {
      body: { ...signUpBody, nickname: 'other' },
    });

    expect(res.status).toBe(409);
    expect(res.body.key).toBe('emailAlreadyExists');
    expect(await db.select().from(userTable)).toHaveLength(1);
  });

  test('rejects a body that is not JSON', async () => {
    const res = await api('POST', '/auth/signup', { rawBody: 'nope' });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidBody');
  });

  test.each([
    ['a short nickname', { nickname: 'ab' }, 'nickname'],
    ['a long nickname', { nickname: 'a'.repeat(21) }, 'nickname'],
    ['an invalid email', { email: 'not-an-email' }, 'email'],
    [
      'a short password',
      { password: 'short', confirmPassword: 'short' },
      'password',
    ],
    [
      'a password confirmation that differs',
      { confirmPassword: 'password456' },
      'confirmPassword',
    ],
    ['no country', { country: '' }, 'country'],
  ])('rejects %s', async (_, override, field) => {
    const res = await api('POST', '/auth/signup', {
      body: { ...signUpBody, ...override },
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidData');
    expect(res.body.errors.fieldErrors).toHaveProperty(field);
    expect(await db.select().from(userTable)).toHaveLength(0);
  });
});

describe('POST /auth/signin', () => {
  test('opens a session for the right credentials', async () => {
    const { user } = await createTestUser({ nickname: 'ana' });

    const res = await api('POST', '/auth/signin', {
      body: { nickname: 'ana', password: PASSWORD },
    });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.user).not.toHaveProperty('password');

    const me = await api('GET', '/auth/me', { token: res.body.token });
    expect(me.status).toBe(200);
  });

  test('every sign in opens its own session', async () => {
    await createTestUser({ nickname: 'ana' });
    const body = { nickname: 'ana', password: PASSWORD };

    const first = await api('POST', '/auth/signin', { body });
    const second = await api('POST', '/auth/signin', { body });

    expect(first.body.token).not.toBe(second.body.token);
  });

  test('rejects a wrong password', async () => {
    await createTestUser({ nickname: 'ana' });

    const res = await api('POST', '/auth/signin', {
      body: { nickname: 'ana', password: 'wrong-password' },
    });

    expect(res.status).toBe(401);
    expect(res.body.key).toBe('invalidUserPassword');
  });

  test('answers the same for an unknown nickname', async () => {
    const res = await api('POST', '/auth/signin', {
      body: { nickname: 'ghost', password: PASSWORD },
    });

    expect(res.status).toBe(401);
    expect(res.body.key).toBe('invalidUserPassword');
  });

  test('a Google account has no password to sign in with', async () => {
    await createTestUser({
      nickname: 'ana',
      password: null,
      googleId: 'google-1',
    });

    const res = await api('POST', '/auth/signin', {
      body: { nickname: 'ana', password: PASSWORD },
    });

    expect(res.status).toBe(401);
    expect(res.body.key).toBe('invalidUserPassword');
  });

  test.each([
    ['no nickname', { password: PASSWORD }],
    ['no password', { nickname: 'ana' }],
    ['an empty nickname', { nickname: '', password: PASSWORD }],
    ['an empty password', { nickname: 'ana', password: '' }],
  ])('rejects %s', async (_, body) => {
    const res = await api('POST', '/auth/signin', { body });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidData');
  });
});

describe('sessions', () => {
  test('GET /auth/me answers the signed in user', async () => {
    const { user, token } = await createTestUser();

    const res = await api('GET', '/auth/me', { token });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, nickname: user.nickname });
    expect(res.body).not.toHaveProperty('password');
  });

  test('requires a token', async () => {
    const res = await api('GET', '/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.key).toBe('notSignedIn');
  });

  test('rejects a token that was never issued', async () => {
    const res = await api('GET', '/auth/me', { token: 'made-up-token' });

    expect(res.status).toBe(401);
    expect(res.body.key).toBe('notSignedIn');
  });

  test('only accepts the bearer scheme', async () => {
    const { token } = await createTestUser();

    const res = await api('GET', '/auth/me', {
      headers: { Authorization: `Basic ${token}` },
    });

    expect(res.status).toBe(401);
  });

  test('an expired session is rejected and deleted', async () => {
    const { token, session } = await createTestUser();
    await db
      .update(sessionTable)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessionTable.id, session.id));

    const res = await api('GET', '/auth/me', { token });

    expect(res.status).toBe(401);
    expect(await db.select().from(sessionTable)).toHaveLength(0);
  });

  test('a session close to its expiry is renewed', async () => {
    const { token, session } = await createTestUser();
    await db
      .update(sessionTable)
      .set({ expiresAt: new Date(Date.now() + 10 * DAY) })
      .where(eq(sessionTable.id, session.id));

    const res = await api('GET', '/auth/me', { token });
    const [renewed] = await db.select().from(sessionTable);

    expect(res.status).toBe(200);
    expect(renewed.expiresAt.getTime() - Date.now()).toBeGreaterThan(
      SESSION_DURATION_MS - HOUR,
    );
  });

  test('a fresh session is left as it is', async () => {
    const { token, session } = await createTestUser();

    await api('GET', '/auth/me', { token });
    const [after] = await db.select().from(sessionTable);

    expect(after.expiresAt.getTime()).toBe(session.expiresAt.getTime());
  });

  test('signing out invalidates only that session', async () => {
    const first = await createTestUser({ nickname: 'ana' });
    const second = await api('POST', '/auth/signin', {
      body: { nickname: 'ana', password: PASSWORD },
    });

    const out = await api('POST', '/auth/signout', { token: first.token });

    expect(out.status).toBe(200);
    expect((await api('GET', '/auth/me', { token: first.token })).status).toBe(
      401,
    );
    expect(
      (await api('GET', '/auth/me', { token: second.body.token })).status,
    ).toBe(200);
  });

  test('signing out requires a session', async () => {
    const res = await api('POST', '/auth/signout');

    expect(res.status).toBe(401);
  });
});

describe('session cache', () => {
  const cacheKey = (sessionId: string) => `session:${sessionId}`;

  async function readCache(sessionId: string) {
    const client = await getClient();
    const raw = await client.get(cacheKey(sessionId));
    return raw ? JSON.parse(raw) : null;
  }

  test('is filled on the first validation, not when the session opens', async () => {
    const { token, session, user } = await createTestUser();

    expect(await readCache(session.id)).toBeNull();

    await api('GET', '/auth/me', { token });
    const cached = await readCache(session.id);

    expect(cached.session.id).toBe(session.id);
    expect(cached.user.id).toBe(user.id);
    expect(cached.user).not.toHaveProperty('password');
  });

  test('never stores the raw token as a key', async () => {
    const { token } = await createTestUser();
    await api('GET', '/auth/me', { token });

    const client = await getClient();
    expect(await client.keys(`*${token}*`)).toHaveLength(0);
  });

  test('expires within five minutes', async () => {
    const { token, session } = await createTestUser();
    await api('GET', '/auth/me', { token });

    const client = await getClient();
    const ttl = await client.ttl(cacheKey(session.id));

    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(300);
  });

  test('serves the user from the cache once filled', async () => {
    const { token, user } = await createTestUser({ nickname: 'ana' });
    await api('GET', '/auth/me', { token });

    await db
      .update(userTable)
      .set({ nickname: 'changed-by-hand' })
      .where(eq(userTable.id, user.id));
    const me = await api('GET', '/auth/me', { token });

    expect(me.body.nickname).toBe('ana');
  });

  test('a profile update evicts the cached user', async () => {
    await seedLanguage('spanish');
    const { token, session } = await createTestUser();
    await api('GET', '/auth/me', { token });

    await api('PUT', '/user/native-lang', {
      token,
      body: { nativeLang: 'spanish' },
    });

    expect(await readCache(session.id)).toBeNull();
    const me = await api('GET', '/auth/me', { token });
    expect(me.body.nativeLanguage).toBe('spanish');
  });

  test('signing out evicts the cached session', async () => {
    const { token, session } = await createTestUser();
    await api('GET', '/auth/me', { token });

    await api('POST', '/auth/signout', { token });

    expect(await readCache(session.id)).toBeNull();
    expect((await api('GET', '/auth/me', { token })).status).toBe(401);
  });

  test('a renewal refreshes the cached expiry', async () => {
    const { token, session } = await createTestUser();
    await db
      .update(sessionTable)
      .set({ expiresAt: new Date(Date.now() + 10 * DAY) })
      .where(eq(sessionTable.id, session.id));

    await api('GET', '/auth/me', { token });
    const cached = await readCache(session.id);

    expect(
      new Date(cached.session.expiresAt).getTime() - Date.now(),
    ).toBeGreaterThan(SESSION_DURATION_MS - HOUR);
  });

  test('a cached session past its expiry is rejected and deleted', async () => {
    const { token, session } = await createTestUser();
    await api('GET', '/auth/me', { token });

    const client = await getClient();
    const cached = await readCache(session.id);
    cached.session.expiresAt = new Date(Date.now() - 1000).toISOString();
    await client.set(cacheKey(session.id), JSON.stringify(cached));

    const res = await api('GET', '/auth/me', { token });

    expect(res.status).toBe(401);
    expect(await readCache(session.id)).toBeNull();
    expect(await db.select().from(sessionTable)).toHaveLength(0);
  });

  test('falls back to Postgres when Redis fails', async () => {
    const { token, user } = await createTestUser();
    const client = await getClient();
    vi.spyOn(client, 'get').mockRejectedValue(new Error('redis down'));
    vi.spyOn(client, 'set').mockRejectedValue(new Error('redis down'));

    const me = await api('GET', '/auth/me', { token });

    expect(me.status).toBe(200);
    expect(me.body.id).toBe(user.id);
  });
});

describe('Google OAuth', () => {
  const claims = {
    sub: 'google-123',
    name: 'Ana Google',
    email: 'ana.google@langdle.test',
  };

  const base64url = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');

  /** Google answers an id token; only its (unverified) claims are read. */
  function mockGoogleExchange() {
    const idToken = `${base64url({ alg: 'RS256' })}.${base64url(claims)}.sig`;

    return vi
      .spyOn(google, 'validateAuthorizationCode')
      .mockResolvedValue({ idToken: () => idToken } as never);
  }

  const callbackCookies = {
    Cookie: 'google_oauth_state=state-1; google_code_verifier=verifier-1',
  };

  test('GET /auth/google redirects to Google and remembers the state', async () => {
    const res = await api('GET', '/auth/google');

    expect(res.status).toBe(302);

    const location = new URL(res.headers.get('location') as string);
    expect(location.origin + location.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    expect(location.searchParams.get('client_id')).toBe(
      'test-google-client-id',
    );
    expect(location.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/auth/google/callback',
    );
    expect(location.searchParams.get('scope')).toContain('email');

    const cookies = res.headers.getSetCookie().join('\n');
    expect(cookies).toContain(
      `google_oauth_state=${location.searchParams.get('state')}`,
    );
    expect(cookies).toContain('google_code_verifier=');
    expect(cookies).toContain('HttpOnly');
  });

  test('the callback needs the code, the state and both cookies', async () => {
    const missingCode = await api('GET', '/auth/google/callback', {
      query: { state: 'state-1' },
      headers: callbackCookies,
    });
    const missingCookies = await api('GET', '/auth/google/callback', {
      query: { code: 'code', state: 'state-1' },
    });

    expect(missingCode.status).toBe(400);
    expect(missingCode.body.key).toBe('invalidCallback');
    expect(missingCookies.status).toBe(400);
    expect(missingCookies.body.key).toBe('invalidCallback');
  });

  test('the callback rejects a state that does not match', async () => {
    const res = await api('GET', '/auth/google/callback', {
      query: { code: 'code', state: 'forged' },
      headers: callbackCookies,
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidState');
  });

  test('the callback rejects a code Google does not accept', async () => {
    vi.spyOn(google, 'validateAuthorizationCode').mockRejectedValue(
      new Error('invalid_grant'),
    );

    const res = await api('GET', '/auth/google/callback', {
      query: { code: 'bad', state: 'state-1' },
      headers: callbackCookies,
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidCode');
  });

  test('a known Google account is signed in', async () => {
    const { user } = await createTestUser({
      googleId: claims.sub,
      password: null,
    });
    mockGoogleExchange();

    const res = await api('GET', '/auth/google/callback', {
      query: { code: 'code', state: 'state-1' },
      headers: callbackCookies,
    });

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/');

    const cookie = res.headers
      .getSetCookie()
      .find(value => value.startsWith('sessionToken='));
    expect(cookie).toContain('HttpOnly');

    const token = (cookie as string).split(';')[0].split('=')[1];
    const me = await api('GET', '/auth/me', { token });
    expect(me.body.id).toBe(user.id);
  });

  test('an unknown Google account is sent to finish its signup', async () => {
    mockGoogleExchange();

    const res = await api('GET', '/auth/google/callback', {
      query: { code: 'code', state: 'state-1' },
      headers: callbackCookies,
    });

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toMatch(/^\/endgoogle\?data=.+/);
    expect(await db.select().from(userTable)).toHaveLength(0);
  });

  test('the signup is finished with the claims carried by the token', async () => {
    mockGoogleExchange();
    const callback = await api('GET', '/auth/google/callback', {
      query: { code: 'code', state: 'state-1' },
      headers: callbackCookies,
    });
    const dataToken = new URL(
      callback.headers.get('location') as string,
      'http://localhost',
    ).searchParams.get('data');

    const res = await api('POST', '/auth/google/signup', {
      body: { dataToken, nickname: 'ana_g', country: 'MX' },
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      nickname: 'ana_g',
      email: claims.email,
      googleId: claims.sub,
      country: 'MX',
    });

    const [stored] = await db.select().from(userTable);
    expect(stored.password).toBeNull();
    expect(
      (await api('GET', '/auth/me', { token: res.body.token })).status,
    ).toBe(200);
  });

  test('an empty nickname falls back to the Google name', async () => {
    mockGoogleExchange();
    const callback = await api('GET', '/auth/google/callback', {
      query: { code: 'code', state: 'state-1' },
      headers: callbackCookies,
    });
    const dataToken = new URL(
      callback.headers.get('location') as string,
      'http://localhost',
    ).searchParams.get('data');

    const res = await api('POST', '/auth/google/signup', {
      body: { dataToken, nickname: '', country: 'MX' },
    });

    expect(res.status).toBe(201);
    expect(res.body.user.nickname).toBe(claims.name);
  });

  test('a signup token that was tampered with is rejected', async () => {
    const res = await api('POST', '/auth/google/signup', {
      body: { dataToken: 'not.a.valid.token', nickname: 'ana', country: 'ES' },
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidToken');
    expect(await db.select().from(userTable)).toHaveLength(0);
  });

  test('a signup cannot take a nickname that exists', async () => {
    await createTestUser({ nickname: 'ana_g' });
    mockGoogleExchange();
    const callback = await api('GET', '/auth/google/callback', {
      query: { code: 'code', state: 'state-1' },
      headers: callbackCookies,
    });
    const dataToken = new URL(
      callback.headers.get('location') as string,
      'http://localhost',
    ).searchParams.get('data');

    const res = await api('POST', '/auth/google/signup', {
      body: { dataToken, nickname: 'ana_g', country: 'ES' },
    });

    expect(res.status).toBe(409);
    expect(res.body.key).toBe('nicknameAlreadyExists');
  });

  test('a signup cannot take an email that is registered', async () => {
    await createTestUser({ email: claims.email });
    mockGoogleExchange();
    const callback = await api('GET', '/auth/google/callback', {
      query: { code: 'code', state: 'state-1' },
      headers: callbackCookies,
    });
    const dataToken = new URL(
      callback.headers.get('location') as string,
      'http://localhost',
    ).searchParams.get('data');

    const res = await api('POST', '/auth/google/signup', {
      body: { dataToken, nickname: 'ana_g', country: 'ES' },
    });

    expect(res.status).toBe(409);
    expect(res.body.key).toBe('emailAlreadyExists');
  });

  test('a signup needs the token and a country', async () => {
    const res = await api('POST', '/auth/google/signup', {
      body: { dataToken: '', nickname: 'ana', country: '' },
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidData');
  });
});
