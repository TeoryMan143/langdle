import { eq } from 'drizzle-orm';
import * as jose from 'jose';
import { beforeAll, describe, expect, test } from 'vitest';
import { db } from '@/core/database/relational/config';
import {
  changeRequestTable,
  gameHistoryTable,
  langPermissionTable,
  sessionTable,
  userTable,
} from '@/core/database/relational/tables';
import { oauthKeySets } from '@/modules/auth/service';
import type { OAuthProvider } from '@/modules/auth/types';
import { api } from '../support/api';
import { createTestAdmin, createTestUser } from '../support/factories';

const ISSUERS: Record<OAuthProvider, string> = {
  google: 'https://accounts.google.com',
  apple: 'https://appleid.apple.com',
};

const AUDIENCES: Record<OAuthProvider, string> = {
  google: 'test-google-ios-client-id',
  apple: 'test.apple.bundle',
};

let privateKey: CryptoKey;

beforeAll(async () => {
  process.env.GOOGLE_MOBILE_CLIENT_IDS = `${AUDIENCES.google},other-id`;
  process.env.APPLE_CLIENT_IDS = AUDIENCES.apple;

  const keys = await jose.generateKeyPair('RS256');
  privateKey = keys.privateKey;

  const jwk = { ...(await jose.exportJWK(keys.publicKey)), kid: 'test-key' };
  const keySet = jose.createLocalJWKSet({ keys: [jwk] });

  oauthKeySets.google = keySet;
  oauthKeySets.apple = keySet;
});

function idToken(
  provider: OAuthProvider,
  {
    sub = `${provider}-sub-1`,
    email = 'oauth@langdle.test',
    audience = AUDIENCES[provider],
    issuer = ISSUERS[provider],
  }: {
    sub?: string;
    email?: string | null;
    audience?: string;
    issuer?: string;
  } = {},
) {
  return new jose.SignJWT({
    ...(email ? { email, email_verified: true } : {}),
    name: 'Oauth Person',
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

describe.each<OAuthProvider>([
  'google',
  'apple',
])('POST /auth/%s/token', provider => {
  const column = provider === 'google' ? 'googleId' : 'appleId';

  test('signs in an existing account', async () => {
    const { user } = await createTestUser({ [column]: `${provider}-sub-1` });

    const res = await api('POST', `/auth/${provider}/token`, {
      body: { idToken: await idToken(provider) },
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('signedIn');
    expect(res.body.user.id).toBe(user.id);

    const me = await api('GET', '/auth/me', { token: res.body.token });
    expect(me.status).toBe(200);
  });

  test('asks a new account to finish the sign up', async () => {
    const res = await api('POST', `/auth/${provider}/token`, {
      body: { idToken: await idToken(provider), nickname: 'chosen' },
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'needsSignup',
      nickname: 'chosen',
      email: 'oauth@langdle.test',
    });

    const data = await api('GET', '/auth/oauth/signup-data', {
      query: { token: res.body.dataToken },
    });
    expect(data.body).toEqual({
      provider,
      nickname: 'chosen',
      email: 'oauth@langdle.test',
    });

    const signup = await api('POST', '/auth/oauth/signup', {
      body: { dataToken: res.body.dataToken, nickname: '', country: 'PT' },
    });

    expect(signup.status).toBe(201);
    expect(signup.body.user).toMatchObject({
      nickname: 'chosen',
      [column]: `${provider}-sub-1`,
    });
  });

  test('rejects a token addressed to another app', async () => {
    const res = await api('POST', `/auth/${provider}/token`, {
      body: { idToken: await idToken(provider, { audience: 'someone' }) },
    });

    expect(res.status).toBe(401);
    expect(res.body.key).toBe('invalidToken');
  });

  test('rejects a token from another issuer', async () => {
    const res = await api('POST', `/auth/${provider}/token`, {
      body: {
        idToken: await idToken(provider, { issuer: 'https://evil.test' }),
      },
    });

    expect(res.status).toBe(401);
  });

  test('needs a verified email to create an account', async () => {
    const res = await api('POST', `/auth/${provider}/token`, {
      body: { idToken: await idToken(provider, { email: null }) },
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('missingEmail');
  });

  test('validates the body', async () => {
    const res = await api('POST', `/auth/${provider}/token`, { body: {} });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidData');
  });
});

describe('GET /auth/oauth/signup-data', () => {
  test('rejects a forged token', async () => {
    const res = await api('GET', '/auth/oauth/signup-data', {
      query: { token: 'forged' },
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidToken');
  });
});

describe('DELETE /auth/me', () => {
  test('deletes the account with everything it owns', async () => {
    const { user, token } = await createTestUser();
    const { user: admin } = await createTestAdmin();

    await db.insert(gameHistoryTable).values({
      userId: user.id,
      type: 'daily',
      targetLang: 'es',
      guesses: 3,
      guessed: true,
    });
    await db
      .insert(langPermissionTable)
      .values({ userId: user.id, lang: 'es' });
    await db.insert(changeRequestTable).values({
      userId: user.id,
      lang: 'es',
      feature: 'tones',
      status: 'present',
      description: 'mine',
    });
    const [reviewed] = await db
      .insert(changeRequestTable)
      .values({
        userId: admin.id,
        lang: 'es',
        feature: 'tones',
        status: 'absent',
        description: 'reviewed by the deleted user',
        state: 'accepted',
        reviewedBy: user.id,
      })
      .returning();

    const res = await api('DELETE', '/auth/me', { token });

    expect(res.status).toBe(200);
    expect(
      await db.select().from(userTable).where(eq(userTable.id, user.id)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(sessionTable)
        .where(eq(sessionTable.userId, user.id)),
    ).toHaveLength(0);
    expect(await db.select().from(gameHistoryTable)).toHaveLength(0);
    expect(await db.select().from(langPermissionTable)).toHaveLength(0);

    const requests = await db.select().from(changeRequestTable);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ id: reviewed.id, reviewedBy: null });

    expect((await api('GET', '/auth/me', { token })).status).toBe(401);
  });

  test('requires a session', async () => {
    expect((await api('DELETE', '/auth/me')).status).toBe(401);
  });
});

describe('session expiry header', () => {
  test('authenticated answers carry the session expiry', async () => {
    const { token, session } = await createTestUser();

    const res = await api('GET', '/auth/me', { token });

    expect(res.headers.get('X-Session-Expires-At')).toBe(
      session.expiresAt.toISOString(),
    );
  });
});

describe('GET /meta', () => {
  test('/features answers the catalogue', async () => {
    const res = await api('GET', '/meta/features');

    expect(res.status).toBe(200);
    expect(res.body.groups.phonology).toContain('tones');
    expect(res.body.statuses).toEqual(['present', 'absent', 'partial']);
  });

  test('/countries answers the country list', async () => {
    const res = await api('GET', '/meta/countries');

    expect(res.body).toContainEqual({ title: 'Afghanistan', value: 'AF' });
  });
});
