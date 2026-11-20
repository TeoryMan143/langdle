import { eq } from 'drizzle-orm';
import * as jose from 'jose';
import { describe, expect, test } from 'vitest';
import { db } from '@/core/database/relational/config';
import {
  langPermissionTable,
  langTokenTable,
} from '@/core/database/relational/tables';
import { api, cronHeaders } from '../support/api';
import {
  createTestAdmin,
  createTestUser,
  getStoredLanguage,
  grantPermission,
  seedLanguage,
} from '../support/factories';

const secret = () => jose.base64url.decode(process.env.JWT_SECRET);

/** What an administrator does to share the edit rights of a language. */
async function mintToken(lang = 'spanish') {
  const admin = await createTestAdmin();
  const res = await api('POST', `/lang/permissions/tokens/${lang}`, {
    token: admin.token,
  });

  return { admin, res, token: res.body?.token as string };
}

describe('GET /lang/permissions/:userId', () => {
  test('lists the languages a user may edit', async () => {
    const { user } = await createTestUser();
    await grantPermission(user.id, 'spanish');
    await grantPermission(user.id, 'basque');

    const res = await api('GET', `/lang/permissions/${user.id}`);

    expect(res.status).toBe(200);
    expect(res.body.sort()).toEqual(['basque', 'spanish']);
  });

  test('answers 404 when the user may edit nothing', async () => {
    const { user } = await createTestUser();

    const res = await api('GET', `/lang/permissions/${user.id}`);

    expect(res.status).toBe(404);
    expect(res.body.key).toBe('permissionNotFound');
  });

  test('does not leak the permissions of other users', async () => {
    const { user } = await createTestUser();
    const other = await createTestUser();
    await grantPermission(other.user.id, 'spanish');

    const res = await api('GET', `/lang/permissions/${user.id}`);

    expect(res.status).toBe(404);
  });

  test('answers 404 for an id that is not a uuid', async () => {
    const res = await api('GET', '/lang/permissions/not-a-uuid');

    expect(res.status).toBe(404);
  });
});

describe('POST /lang/permissions/tokens/:lang', () => {
  test('requires a session', async () => {
    await seedLanguage('spanish');

    const res = await api('POST', '/lang/permissions/tokens/spanish');

    expect(res.status).toBe(401);
  });

  test('is only for administrators', async () => {
    await seedLanguage('spanish');
    const { token } = await createTestUser();

    const res = await api('POST', '/lang/permissions/tokens/spanish', {
      token,
    });

    expect(res.status).toBe(403);
    expect(await db.select().from(langTokenTable)).toHaveLength(0);
  });

  test('answers 404 for a language that does not exist', async () => {
    const admin = await createTestAdmin();

    const res = await api('POST', '/lang/permissions/tokens/klingon', {
      token: admin.token,
    });

    expect(res.status).toBe(404);
    expect(await db.select().from(langTokenTable)).toHaveLength(0);
  });

  test('mints an encrypted token for that language', async () => {
    await seedLanguage('spanish');

    const { res, token } = await mintToken();

    expect(res.status).toBe(200);

    const { payload } = await jose.jwtDecrypt<{ lang: string; code: string }>(
      token,
      secret(),
    );
    expect(payload.lang).toBe('spanish');
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
    expect(payload.exp).toBeLessThanOrEqual(Date.now() / 1000 + 30 * 60);
  });

  test('stores only the hash of the code the token carries', async () => {
    await seedLanguage('spanish');

    const { token } = await mintToken();

    const { payload } = await jose.jwtDecrypt<{ code: string }>(
      token,
      secret(),
    );
    const [stored] = await db.select().from(langTokenTable);

    expect(stored.lang).toBe('spanish');
    expect(stored.code).not.toBe(payload.code);
    expect(stored.code).toMatch(/^[0-9a-f]{64}$/);
  });

  test('every token is different', async () => {
    await seedLanguage('spanish');
    const admin = await createTestAdmin();

    const first = await api('POST', '/lang/permissions/tokens/spanish', {
      token: admin.token,
    });
    const second = await api('POST', '/lang/permissions/tokens/spanish', {
      token: admin.token,
    });

    expect(first.body.token).not.toBe(second.body.token);
    expect(await db.select().from(langTokenTable)).toHaveLength(2);
  });
});

describe('PUT /lang/permissions/claim/:token', () => {
  test('requires a session', async () => {
    await seedLanguage('spanish');
    const { token } = await mintToken();

    const res = await api('PUT', `/lang/permissions/claim/${token}`);

    expect(res.status).toBe(401);
  });

  test('grants the language the token carries', async () => {
    await seedLanguage('spanish');
    const { token } = await mintToken();
    const editor = await createTestUser();

    const res = await api('PUT', `/lang/permissions/claim/${token}`, {
      token: editor.token,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ lang: 'spanish' });
    expect(
      (await api('GET', `/lang/permissions/${editor.user.id}`)).body,
    ).toEqual(['spanish']);
  });

  test('the new editor can edit that language and no other', async () => {
    await seedLanguage('spanish');
    await seedLanguage('basque');
    const { token } = await mintToken();
    const editor = await createTestUser();
    const data = {
      name: 'Spanish',
      active: true,
      features: ['svo'],
      partial: [],
      searchParams: [],
    };

    await api('PUT', `/lang/permissions/claim/${token}`, {
      token: editor.token,
    });

    const own = await api('PUT', '/lang/spanish', {
      token: editor.token,
      body: data,
    });
    const other = await api('PUT', '/lang/basque', {
      token: editor.token,
      body: data,
    });
    expect(own.status).toBe(200);
    expect(other.status).toBe(403);
    expect((await getStoredLanguage('spanish'))?.features).toEqual(['svo']);
  });

  test('a token works once', async () => {
    await seedLanguage('spanish');
    const { token } = await mintToken();
    const first = await createTestUser();
    const second = await createTestUser();

    await api('PUT', `/lang/permissions/claim/${token}`, {
      token: first.token,
    });
    const res = await api('PUT', `/lang/permissions/claim/${token}`, {
      token: second.token,
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('tokenNotFound');
    expect(await db.select().from(langPermissionTable)).toHaveLength(1);
    expect(await db.select().from(langTokenTable)).toHaveLength(0);
  });

  test('claiming twice does not duplicate the permission', async () => {
    await seedLanguage('spanish');
    const editor = await createTestUser();
    const first = await mintToken();
    const second = await mintToken();

    await api('PUT', `/lang/permissions/claim/${first.token}`, {
      token: editor.token,
    });
    const res = await api('PUT', `/lang/permissions/claim/${second.token}`, {
      token: editor.token,
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('userHasPermission');
    expect(await db.select().from(langPermissionTable)).toHaveLength(1);
    // both tokens are spent: the second one is deleted before the duplicate
    // is detected, so it cannot be handed to someone else
    expect(await db.select().from(langTokenTable)).toHaveLength(0);
  });

  test('administrators have no use for permissions', async () => {
    await seedLanguage('spanish');
    const { token } = await mintToken();
    const admin = await createTestAdmin();

    const res = await api('PUT', `/lang/permissions/claim/${token}`, {
      token: admin.token,
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('userIsAdmin');
    expect(await db.select().from(langPermissionTable)).toHaveLength(0);
    // the token is not wasted on them
    expect(await db.select().from(langTokenTable)).toHaveLength(1);
  });

  test('rejects something that is not a token', async () => {
    const editor = await createTestUser();

    const res = await api('PUT', '/lang/permissions/claim/garbage', {
      token: editor.token,
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('unknown');
  });

  test('rejects a token encrypted with another secret', async () => {
    const editor = await createTestUser();
    const forged = await new jose.EncryptJWT({ lang: 'spanish', code: 'x' })
      .setExpirationTime('30m')
      .setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
      .encrypt(crypto.getRandomValues(new Uint8Array(64)));

    const res = await api('PUT', `/lang/permissions/claim/${forged}`, {
      token: editor.token,
    });

    expect(res.status).toBe(400);
    expect(await db.select().from(langPermissionTable)).toHaveLength(0);
  });

  test('rejects a token that expired', async () => {
    const editor = await createTestUser();
    const expired = await new jose.EncryptJWT({ lang: 'spanish', code: 'x' })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
      .encrypt(secret());

    const res = await api('PUT', `/lang/permissions/claim/${expired}`, {
      token: editor.token,
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('tokenExpired');
  });

  test('rejects a valid token whose record was cleaned up', async () => {
    await seedLanguage('spanish');
    const { token } = await mintToken();
    const editor = await createTestUser();
    await db.delete(langTokenTable);

    const res = await api('PUT', `/lang/permissions/claim/${token}`, {
      token: editor.token,
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('tokenNotFound');
  });

  test('the token of one language never grants another', async () => {
    await seedLanguage('spanish');
    await seedLanguage('basque');
    const { token } = await mintToken('basque');
    const editor = await createTestUser();

    await api('PUT', `/lang/permissions/claim/${token}`, {
      token: editor.token,
    });

    const [permission] = await db
      .select()
      .from(langPermissionTable)
      .where(eq(langPermissionTable.userId, editor.user.id));
    expect(permission.lang).toBe('basque');
  });

  // A race only shows up some of the time, hence the repetitions.
  test('two users racing for the same token: one wins', {
    repeats: 15,
  }, async () => {
    await seedLanguage('spanish');
    const { token } = await mintToken();
    const first = await createTestUser();
    const second = await createTestUser();

    const results = await Promise.all([
      api('PUT', `/lang/permissions/claim/${token}`, { token: first.token }),
      api('PUT', `/lang/permissions/claim/${token}`, { token: second.token }),
    ]);

    expect(results.filter(res => res.status === 200)).toHaveLength(1);
    expect(await db.select().from(langPermissionTable)).toHaveLength(1);
  });
});

describe('GET /lang/jobs/cleanup-tokens', () => {
  const hour = 1000 * 60 * 60;

  test('requires the cron secret', async () => {
    const missing = await api('GET', '/lang/jobs/cleanup-tokens');
    const wrong = await api('GET', '/lang/jobs/cleanup-tokens', {
      headers: { Authorization: 'Bearer nope' },
    });

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(missing.body.key).toBe('unauthorized');
  });

  test('a session token is not the cron secret', async () => {
    const { token } = await createTestAdmin();

    const res = await api('GET', '/lang/jobs/cleanup-tokens', { token });

    expect(res.status).toBe(401);
  });

  test('deletes the expired tokens and keeps the live ones', async () => {
    await db.insert(langTokenTable).values([
      { code: 'old', lang: 'spanish', expiresAt: new Date(Date.now() - hour) },
      { code: 'live', lang: 'basque', expiresAt: new Date(Date.now() + hour) },
    ]);

    const res = await api('GET', '/lang/jobs/cleanup-tokens', {
      headers: cronHeaders,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(
      (await db.select().from(langTokenTable)).map(row => row.code),
    ).toEqual(['live']);
  });

  test('succeeds when there is nothing to clean', async () => {
    const res = await api('GET', '/lang/jobs/cleanup-tokens', {
      headers: cronHeaders,
    });

    expect(res.status).toBe(200);
  });

  test('a freshly minted token expires in ten minutes', async () => {
    await seedLanguage('spanish');
    await mintToken();

    const [stored] = await db.select().from(langTokenTable);
    const remaining = stored.expiresAt.getTime() - Date.now();

    expect(remaining).toBeGreaterThan(9 * 60 * 1000);
    expect(remaining).toBeLessThanOrEqual(10 * 60 * 1000 + 5000);
  });

  test('a freshly minted token survives the job', async () => {
    await seedLanguage('spanish');
    const { token } = await mintToken();

    await api('GET', '/lang/jobs/cleanup-tokens', { headers: cronHeaders });

    expect(await db.select().from(langTokenTable)).toHaveLength(1);
    const editor = await createTestUser();
    const res = await api('PUT', `/lang/permissions/claim/${token}`, {
      token: editor.token,
    });
    expect(res.status).toBe(200);
  });
});
