import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { db } from '@/core/database/relational/config';
import {
  langPermissionTable,
  languageRequestTable,
} from '@/core/database/relational/tables';
import { sendEmail } from '@/core/lib/email';
import { copyObject, deleteObject, putObject } from '@/core/lib/storage';
import { api } from '../support/api';
import {
  createTestAdmin,
  createTestUser,
  getStoredLanguage,
  seedLanguage,
} from '../support/factories';

const data = {
  code: 'eu',
  name: 'Euskara',
  exonym: 'Basque',
  features: ['sov', 'ergativeAlignment'],
  partial: ['palatalization'],
  description: 'A language isolate spoken in the Basque Country',
};

let png: Uint8Array<ArrayBuffer>;

beforeAll(async () => {
  png = new Uint8Array(
    await sharp({
      create: { width: 60, height: 40, channels: 3, background: '#c00' },
    })
      .png()
      .toBuffer(),
  );
});

function requestForm(
  overrides: Record<string, unknown> = {},
  flag: File | string | null = new File([png], 'flag.png', {
    type: 'image/png',
  }),
) {
  const form = new FormData();
  form.set('data', JSON.stringify({ ...data, ...overrides }));

  if (flag !== null) {
    form.set('flag', flag);
  }

  return form;
}

async function postRequest(token: string, form = requestForm()) {
  return api('POST', '/lang/language-requests', { token, form });
}

describe('POST /lang/language-requests', () => {
  test('requires a session', async () => {
    const res = await api('POST', '/lang/language-requests', {
      form: requestForm(),
    });

    expect(res.status).toBe(401);
  });

  test('stores a pending request and uploads the flag as WebP', async () => {
    const { user, token } = await createTestUser();

    const res = await postRequest(token);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      code: 'eu',
      name: 'Euskara',
      state: 'pending',
      features: ['ergativeAlignment', 'sov'],
      partial: ['palatalization'],
    });

    const [stored] = await db.select().from(languageRequestTable);
    expect(stored).toMatchObject({
      userId: user.id,
      code: 'eu',
      exonym: 'Basque',
      state: 'pending',
      flagKey: `language-requests/${stored.id}.webp`,
    });
    expect(res.body.flagUrl).toBe(
      `https://flags.langdle.test/language-requests/${stored.id}.webp`,
    );

    expect(putObject).toHaveBeenCalledOnce();
    const [key, body, type] = vi.mocked(putObject).mock.calls[0];
    expect(key).toBe(stored.flagKey);
    expect(type).toBe('image/webp');
    expect(await sharp(body).metadata()).toMatchObject({
      format: 'webp',
      width: 455,
      height: 304,
    });
  });

  test('normalizes the code and remembers the locale', async () => {
    const { token } = await createTestUser();

    await postRequest(token, requestForm({ code: ' EU ', locale: 'es' }));

    const [stored] = await db.select().from(languageRequestTable);
    expect(stored).toMatchObject({ code: 'eu', locale: 'es' });
  });

  test('refuses a language that is already in the game', async () => {
    await seedLanguage('eu');
    const { token } = await createTestUser();

    const res = await postRequest(token);

    expect(res.status).toBe(409);
    expect(res.body.key).toBe('langExists');
    expect(putObject).not.toHaveBeenCalled();
  });

  test('refuses a second open request for the same code', async () => {
    const first = await createTestUser();
    const second = await createTestUser();
    await postRequest(first.token);

    const res = await postRequest(second.token);

    expect(res.status).toBe(409);
    expect(res.body.key).toBe('requestPending');
    expect(await db.select().from(languageRequestTable)).toHaveLength(1);
  });

  test.each([
    ['a code with digits', { code: 'e1' }],
    ['a code of four letters', { code: 'abcd' }],
    ['no name', { name: '' }],
    ['no description', { description: '' }],
    ['an unknown feature', { features: ['notAFeature'] }],
    ['a feature both present and partial', { partial: ['sov'] }],
  ])('rejects %s', async (_, override) => {
    const { token } = await createTestUser();

    const res = await postRequest(token, requestForm(override));

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidData');
    expect(putObject).not.toHaveBeenCalled();
  });

  test('rejects a data field that is not JSON', async () => {
    const { token } = await createTestUser();
    const form = requestForm();
    form.set('data', 'nope');

    const res = await postRequest(token, form);

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidBody');
  });

  test.each([
    ['no flag', null],
    ['a flag that is not a file', 'flag.png'],
    [
      'an SVG flag',
      new File(['<svg/>'], 'flag.svg', { type: 'image/svg+xml' }),
    ],
    [
      'a flag over 2 MB',
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'flag.png', {
        type: 'image/png',
      }),
    ],
    [
      'a file that only claims to be an image',
      new File(['not an image'], 'flag.png', { type: 'image/png' }),
    ],
  ])('rejects %s', async (_, flag) => {
    const { token } = await createTestUser();

    const res = await postRequest(token, requestForm({}, flag));

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidFlag');
    expect(putObject).not.toHaveBeenCalled();
    expect(await db.select().from(languageRequestTable)).toHaveLength(0);
  });

  test('answers 500 and stores nothing when the upload fails', async () => {
    vi.mocked(putObject).mockResolvedValueOnce(false);
    const { token } = await createTestUser();

    const res = await postRequest(token);

    expect(res.status).toBe(500);
    expect(await db.select().from(languageRequestTable)).toHaveLength(0);
  });
});

describe('GET /lang/language-requests', () => {
  test('/mine lists only the requests of the caller', async () => {
    const me = await createTestUser();
    const other = await createTestUser();
    await postRequest(me.token);
    await postRequest(other.token, requestForm({ code: 'gl', name: 'Galego' }));

    const res = await api('GET', '/lang/language-requests/mine', {
      token: me.token,
    });

    expect(res.status).toBe(200);
    expect(res.body.map((r: { code: string }) => r.code)).toEqual(['eu']);
  });

  test('the full list is for administrators only', async () => {
    const { token } = await createTestUser();

    const res = await api('GET', '/lang/language-requests', { token });

    expect(res.status).toBe(403);
  });

  test('administrators see every request with its author', async () => {
    const author = await createTestUser();
    const admin = await createTestAdmin();
    await postRequest(author.token);

    const res = await api('GET', '/lang/language-requests', {
      token: admin.token,
      query: { state: 'pending' },
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].user).toEqual({
      id: author.user.id,
      nickname: author.user.nickname,
    });
  });

  test('rejects an unknown state filter', async () => {
    const admin = await createTestAdmin();

    const res = await api('GET', '/lang/language-requests', {
      token: admin.token,
      query: { state: 'maybe' },
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidState');
  });
});

describe('reviewing a language request', () => {
  async function pendingRequest() {
    const author = await createTestUser();
    const admin = await createTestAdmin();
    await postRequest(author.token);
    const [request] = await db.select().from(languageRequestTable);

    return { author, admin, request };
  }

  test('only administrators can review', async () => {
    const { author, request } = await pendingRequest();

    const res = await api(
      'PUT',
      `/lang/language-requests/${request.id}/accept`,
      { token: author.token },
    );

    expect(res.status).toBe(403);
  });

  test('accepting creates the language inactive, publishes the flag and lets the author edit it', async () => {
    const { author, admin, request } = await pendingRequest();

    const res = await api(
      'PUT',
      `/lang/language-requests/${request.id}/accept`,
      { token: admin.token },
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      emailSent: true,
      request: {
        state: 'accepted',
        flagUrl: 'https://flags.langdle.test/flags/eu.webp',
      },
    });

    expect(await getStoredLanguage('eu')).toEqual({
      name: 'Euskara',
      exonym: 'Basque',
      active: false,
      features: ['ergativeAlignment', 'sov'],
      partial: ['palatalization'],
      searchParams: ['Euskara', 'Basque', 'eu'],
    });

    expect(copyObject).toHaveBeenCalledWith(request.flagKey, 'flags/eu.webp');
    expect(deleteObject).toHaveBeenCalledWith(request.flagKey);

    const permissions = await db
      .select()
      .from(langPermissionTable)
      .where(eq(langPermissionTable.userId, author.user.id));
    expect(permissions).toEqual([{ userId: author.user.id, lang: 'eu' }]);

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(vi.mocked(sendEmail).mock.calls[0][0].to).toBe(author.user.email);
  });

  test('a failed flag copy releases the request and creates nothing', async () => {
    vi.mocked(copyObject).mockResolvedValueOnce(false);
    const { admin, request } = await pendingRequest();

    const res = await api(
      'PUT',
      `/lang/language-requests/${request.id}/accept`,
      { token: admin.token },
    );

    expect(res.status).toBe(500);
    expect(await getStoredLanguage('eu')).toBeNull();

    const [stored] = await db.select().from(languageRequestTable);
    expect(stored).toMatchObject({ state: 'pending', reviewedBy: null });
  });

  test('accepting a code that was taken meanwhile fails', async () => {
    const { admin, request } = await pendingRequest();
    await seedLanguage('eu');

    const res = await api(
      'PUT',
      `/lang/language-requests/${request.id}/accept`,
      { token: admin.token },
    );

    expect(res.status).toBe(409);
    expect(res.body.key).toBe('langExists');
  });

  test('rejecting stores the reason, deletes the upload and mails the author', async () => {
    const { admin, request } = await pendingRequest();

    const res = await api(
      'PUT',
      `/lang/language-requests/${request.id}/reject`,
      { token: admin.token, body: { reason: 'Not enough sources' } },
    );

    expect(res.status).toBe(200);
    expect(res.body.request).toMatchObject({
      state: 'rejected',
      rejectionReason: 'Not enough sources',
      flagUrl: null,
    });
    expect(deleteObject).toHaveBeenCalledWith(request.flagKey);
    expect(await getStoredLanguage('eu')).toBeNull();
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  test('rejecting needs a reason', async () => {
    const { admin, request } = await pendingRequest();

    const res = await api(
      'PUT',
      `/lang/language-requests/${request.id}/reject`,
      { token: admin.token, body: { reason: '' } },
    );

    expect(res.status).toBe(400);
  });

  test('a request can only be reviewed once', async () => {
    const { admin, request } = await pendingRequest();
    const path = `/lang/language-requests/${request.id}`;

    await api('PUT', `${path}/reject`, {
      token: admin.token,
      body: { reason: 'No' },
    });
    const res = await api('PUT', `${path}/accept`, { token: admin.token });

    expect(res.status).toBe(409);
    expect(res.body.key).toBe('requestAlreadyReviewed');
  });

  test('a new request for the code can be opened once the old one is rejected', async () => {
    const { author, admin, request } = await pendingRequest();
    await api('PUT', `/lang/language-requests/${request.id}/reject`, {
      token: admin.token,
      body: { reason: 'Fix the features' },
    });

    const res = await postRequest(author.token);

    expect(res.status).toBe(201);
  });

  test('an unknown request is a 404', async () => {
    const admin = await createTestAdmin();

    const res = await api(
      'PUT',
      `/lang/language-requests/${crypto.randomUUID()}/accept`,
      { token: admin.token },
    );

    expect(res.status).toBe(404);
  });
});
