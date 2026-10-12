import { eq } from 'drizzle-orm';
import { describe, expect, test, vi } from 'vitest';
import { getClient } from '@/core/database/redis/config';
import { db } from '@/core/database/relational/config';
import { changeRequestTable } from '@/core/database/relational/tables';
import { sendEmail } from '@/core/lib/email';
import { api, type JsonBody } from '../support/api';
import {
  createTestAdmin,
  createTestUser,
  getStoredLanguage,
  seedChangeRequest,
  seedLanguage,
} from '../support/factories';

const body = {
  lang: 'spanish',
  feature: 'tones',
  status: 'present',
  description: 'Spanish does have tones',
};

const ids = (list: JsonBody) =>
  list.map((request: { id: string }) => request.id);

describe('POST /lang/change-requests', () => {
  test('requires a session', async () => {
    const res = await api('POST', '/lang/change-requests', { body });

    expect(res.status).toBe(401);
  });

  test('stores a pending request for the caller', async () => {
    const { user, token } = await createTestUser();

    const res = await api('POST', '/lang/change-requests', { token, body });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ result: true });

    const [stored] = await db.select().from(changeRequestTable);
    expect(stored).toMatchObject({
      userId: user.id,
      lang: 'spanish',
      feature: 'tones',
      status: 'present',
      description: 'Spanish does have tones',
      state: 'pending',
      locale: 'en',
      reviewedBy: null,
    });
  });

  test('remembers the locale for the resolution email', async () => {
    const { token } = await createTestUser();

    await api('POST', '/lang/change-requests', {
      token,
      body: { ...body, locale: 'pt' },
    });

    const [stored] = await db.select().from(changeRequestTable);
    expect(stored.locale).toBe('pt');
  });

  test('the client cannot decide the author or the state', async () => {
    const author = await createTestUser();
    const other = await createTestUser();

    await api('POST', '/lang/change-requests', {
      token: author.token,
      body: {
        ...body,
        userId: other.user.id,
        state: 'accepted',
        reviewedBy: other.user.id,
      },
    });

    const [stored] = await db.select().from(changeRequestTable);
    expect(stored).toMatchObject({
      userId: author.user.id,
      state: 'pending',
      reviewedBy: null,
    });
  });

  test.each([
    ['no description', { description: '' }],
    ['a description over 1000 characters', { description: 'x'.repeat(1001) }],
    ['an unknown feature', { feature: 'notAFeature' }],
    ['an unknown status', { status: 'maybe' }],
    ['an unsupported locale', { locale: 'fr' }],
    ['no language', { lang: '' }],
  ])('rejects %s', async (_, override) => {
    const { token } = await createTestUser();

    const res = await api('POST', '/lang/change-requests', {
      token,
      body: { ...body, ...override },
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidData');
    expect(await db.select().from(changeRequestTable)).toHaveLength(0);
  });

  test('rejects a body that is not JSON', async () => {
    const { token } = await createTestUser();

    const res = await api('POST', '/lang/change-requests', {
      token,
      rawBody: 'nope',
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidBody');
  });
});

describe('GET /lang/change-requests/mine', () => {
  test('requires a session', async () => {
    const res = await api('GET', '/lang/change-requests/mine');

    expect(res.status).toBe(401);
  });

  test('is empty for a user that never asked for anything', async () => {
    const { token } = await createTestUser();

    const res = await api('GET', '/lang/change-requests/mine', { token });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('lists only the requests of the caller, newest first', async () => {
    const me = await createTestUser();
    const other = await createTestUser();
    const old = await seedChangeRequest({
      userId: me.user.id,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    const recent = await seedChangeRequest({
      userId: me.user.id,
      createdAt: new Date('2026-06-01T00:00:00Z'),
    });
    await seedChangeRequest({ userId: other.user.id });

    const res = await api('GET', '/lang/change-requests/mine', {
      token: me.token,
    });

    expect(ids(res.body)).toEqual([recent.id, old.id]);
  });

  test('shows the state and the rejection reason', async () => {
    const me = await createTestUser();
    const admin = await createTestAdmin();
    const request = await seedChangeRequest({
      userId: me.user.id,
      state: 'rejected',
      rejectionReason: 'No sources',
      reviewedAt: new Date('2026-06-02T00:00:00Z'),
      reviewedBy: admin.user.id,
    });

    const res = await api('GET', '/lang/change-requests/mine', {
      token: me.token,
    });

    expect(res.body[0]).toEqual({
      id: request.id,
      lang: 'spanish',
      feature: 'tones',
      status: 'present',
      description: 'Spanish does have tones',
      state: 'rejected',
      rejectionReason: 'No sources',
      createdAt: request.createdAt.toISOString(),
      reviewedAt: '2026-06-02T00:00:00.000Z',
    });
  });

  test('does not expose the author, the reviewer or the locale', async () => {
    const me = await createTestUser();
    await seedChangeRequest({ userId: me.user.id });

    const res = await api('GET', '/lang/change-requests/mine', {
      token: me.token,
    });

    expect(res.body[0]).not.toHaveProperty('userId');
    expect(res.body[0]).not.toHaveProperty('reviewedBy');
    expect(res.body[0]).not.toHaveProperty('locale');
  });
});

describe('GET /lang/change-requests', () => {
  test('requires a session', async () => {
    const res = await api('GET', '/lang/change-requests');

    expect(res.status).toBe(401);
  });

  test('is only for administrators', async () => {
    const { token } = await createTestUser();

    const res = await api('GET', '/lang/change-requests', { token });

    expect(res.status).toBe(403);
    expect(res.body.key).toBe('noAdmin');
  });

  test('lists the requests of everybody with their author', async () => {
    const admin = await createTestAdmin();
    const ana = await createTestUser({ nickname: 'ana' });
    const luis = await createTestUser({ nickname: 'luis' });
    const first = await seedChangeRequest({
      userId: ana.user.id,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    const second = await seedChangeRequest({
      userId: luis.user.id,
      createdAt: new Date('2026-02-01T00:00:00Z'),
    });

    const res = await api('GET', '/lang/change-requests', {
      token: admin.token,
    });

    expect(ids(res.body)).toEqual([second.id, first.id]);
    expect(res.body[0].user).toEqual({ id: luis.user.id, nickname: 'luis' });
    expect(res.body[1].user).toEqual({ id: ana.user.id, nickname: 'ana' });
  });

  test('never exposes the email or the password of the author', async () => {
    const admin = await createTestAdmin();
    const ana = await createTestUser();
    await seedChangeRequest({ userId: ana.user.id });

    const res = await api('GET', '/lang/change-requests', {
      token: admin.token,
    });

    expect(res.text).not.toContain(ana.user.email);
    expect(res.text).not.toContain('password');
  });

  test('filters by state', async () => {
    const admin = await createTestAdmin();
    const { user } = await createTestUser();
    const pending = await seedChangeRequest({ userId: user.id });
    const accepted = await seedChangeRequest({
      userId: user.id,
      state: 'accepted',
    });
    const rejected = await seedChangeRequest({
      userId: user.id,
      state: 'rejected',
    });

    const list = (state: string) =>
      api('GET', '/lang/change-requests', {
        token: admin.token,
        query: { state },
      });

    expect(ids((await list('pending')).body)).toEqual([pending.id]);
    expect(ids((await list('accepted')).body)).toEqual([accepted.id]);
    expect(ids((await list('rejected')).body)).toEqual([rejected.id]);
  });

  test('rejects a state that does not exist', async () => {
    const admin = await createTestAdmin();

    const res = await api('GET', '/lang/change-requests', {
      token: admin.token,
      query: { state: 'archived' },
    });

    expect(res.status).toBe(400);
    expect(res.body.key).toBe('invalidState');
  });

  test('shows the status a pending request would change', async () => {
    const admin = await createTestAdmin();
    const { user } = await createTestUser();
    await seedLanguage('spanish', { features: ['tones'], partial: ['tense'] });
    await seedChangeRequest({ userId: user.id, feature: 'tones' });
    await seedChangeRequest({ userId: user.id, feature: 'tense' });
    await seedChangeRequest({ userId: user.id, feature: 'aspect' });

    const res = await api('GET', '/lang/change-requests', {
      token: admin.token,
    });

    const current = Object.fromEntries(
      res.body.map(
        (r: { feature: string; currentStatus: string }) =>
          [r.feature, r.currentStatus] as const,
      ),
    );
    expect(current).toEqual({
      tones: 'present',
      tense: 'partial',
      aspect: 'absent',
    });
  });

  test('has no current status for a resolved request or a missing language', async () => {
    const admin = await createTestAdmin();
    const { user } = await createTestUser();
    await seedLanguage('spanish', { features: ['tones'] });
    await seedChangeRequest({ userId: user.id, state: 'accepted' });
    await seedChangeRequest({ userId: user.id, lang: 'klingon' });

    const res = await api('GET', '/lang/change-requests', {
      token: admin.token,
    });

    expect(res.body).toHaveLength(2);
    expect(
      res.body.map((r: { currentStatus: unknown }) => r.currentStatus),
    ).toEqual([null, null]);
  });
});

describe('PUT /lang/change-requests/:id/accept', () => {
  async function pendingRequest(overrides = {}) {
    const author = await createTestUser({ nickname: 'ana' });
    const admin = await createTestAdmin();
    const request = await seedChangeRequest({
      userId: author.user.id,
      lang: 'spanish',
      feature: 'tones',
      status: 'present',
      ...overrides,
    });

    return { author, admin, request };
  }

  test('requires a session', async () => {
    const { request } = await pendingRequest();

    const res = await api('PUT', `/lang/change-requests/${request.id}/accept`);

    expect(res.status).toBe(401);
  });

  test('is only for administrators', async () => {
    const { author, request } = await pendingRequest();
    await seedLanguage('spanish');

    const res = await api('PUT', `/lang/change-requests/${request.id}/accept`, {
      token: author.token,
    });

    expect(res.status).toBe(403);
    expect((await getStoredLanguage('spanish'))?.features).toEqual([]);
  });

  test('applies the change to the language', async () => {
    await seedLanguage('spanish', { features: ['svo'], partial: [] });
    const { admin, request } = await pendingRequest();

    const res = await api('PUT', `/lang/change-requests/${request.id}/accept`, {
      token: admin.token,
    });

    expect(res.status).toBe(200);
    expect(await getStoredLanguage('spanish')).toMatchObject({
      name: 'spanish',
      features: ['svo', 'tones'],
      partial: [],
    });
  });

  test.each([
    ['partial', { features: ['svo'], partial: ['tones'] }],
    ['absent', { features: ['svo'], partial: [] }],
    ['present', { features: ['svo', 'tones'], partial: [] }],
  ] as const)('moves the feature to %s', async (status, expected) => {
    await seedLanguage('spanish', { features: ['svo', 'tones'] });
    const { admin, request } = await pendingRequest({ status });

    await api('PUT', `/lang/change-requests/${request.id}/accept`, {
      token: admin.token,
    });

    expect(await getStoredLanguage('spanish')).toMatchObject(expected);
  });

  test('marks the request accepted and who reviewed it', async () => {
    await seedLanguage('spanish');
    const { admin, request } = await pendingRequest();

    const res = await api('PUT', `/lang/change-requests/${request.id}/accept`, {
      token: admin.token,
    });

    expect(res.body.request).toMatchObject({
      id: request.id,
      state: 'accepted',
      rejectionReason: null,
    });
    expect(res.body.request.reviewedAt).toEqual(expect.any(String));
    expect(res.body.emailSent).toBe(true);

    const [stored] = await db
      .select()
      .from(changeRequestTable)
      .where(eq(changeRequestTable.id, request.id));
    expect(stored).toMatchObject({
      state: 'accepted',
      reviewedBy: admin.user.id,
    });
    expect(stored.reviewedAt).toBeInstanceOf(Date);
  });

  test('tells the author by email, in their language', async () => {
    await seedLanguage('spanish', { name: 'Spanish' });
    const { author, admin, request } = await pendingRequest({ locale: 'es' });

    await api('PUT', `/lang/change-requests/${request.id}/accept`, {
      token: admin.token,
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: author.user.email,
        subject: expect.stringContaining('fue aceptada'),
      }),
    );
  });

  test('falls back to english for a locale it does not know', async () => {
    await seedLanguage('spanish');
    const { admin, request } = await pendingRequest({ locale: 'xx' });

    await api('PUT', `/lang/change-requests/${request.id}/accept`, {
      token: admin.token,
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('was accepted'),
      }),
    );
  });

  test('still accepts when the email could not be sent', async () => {
    vi.mocked(sendEmail).mockResolvedValue(false);
    await seedLanguage('spanish');
    const { admin, request } = await pendingRequest();

    const res = await api('PUT', `/lang/change-requests/${request.id}/accept`, {
      token: admin.token,
    });

    expect(res.status).toBe(200);
    expect(res.body.emailSent).toBe(false);
    expect((await getStoredLanguage('spanish'))?.features).toContain('tones');
  });

  test('answers 404 for a request that does not exist', async () => {
    const admin = await createTestAdmin();

    const res = await api(
      'PUT',
      `/lang/change-requests/${crypto.randomUUID()}/accept`,
      { token: admin.token },
    );

    expect(res.status).toBe(404);
    expect(res.body.key).toBe('requestNotFound');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  test('answers 404 when the language is gone and leaves the request pending', async () => {
    const { admin, request } = await pendingRequest({ lang: 'klingon' });

    const res = await api('PUT', `/lang/change-requests/${request.id}/accept`, {
      token: admin.token,
    });

    expect(res.status).toBe(404);
    expect(res.body.key).toBe('langNotFound');
    const [stored] = await db.select().from(changeRequestTable);
    expect(stored.state).toBe('pending');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  test('cannot be applied twice', async () => {
    await seedLanguage('spanish');
    const { admin, request } = await pendingRequest();
    const path = `/lang/change-requests/${request.id}/accept`;

    await api('PUT', path, { token: admin.token });
    const again = await api('PUT', path, { token: admin.token });

    expect(again.status).toBe(409);
    expect(again.body.key).toBe('requestAlreadyReviewed');
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  test('two administrators accepting at once: only one applies it', async () => {
    await seedLanguage('spanish');
    const { admin, request } = await pendingRequest();
    const other = await createTestAdmin();
    const path = `/lang/change-requests/${request.id}/accept`;

    const results = await Promise.all([
      api('PUT', path, { token: admin.token }),
      api('PUT', path, { token: other.token }),
    ]);

    expect(results.map(res => res.status).sort()).toEqual([200, 409]);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const stored = await getStoredLanguage('spanish');
    expect(stored?.features.filter(f => f === 'tones')).toHaveLength(1);
  });

  test('a rejected request cannot be accepted afterwards', async () => {
    await seedLanguage('spanish');
    const { admin, request } = await pendingRequest();

    await api('PUT', `/lang/change-requests/${request.id}/reject`, {
      token: admin.token,
      body: { reason: 'No sources' },
    });
    const res = await api('PUT', `/lang/change-requests/${request.id}/accept`, {
      token: admin.token,
    });

    expect(res.status).toBe(409);
    expect((await getStoredLanguage('spanish'))?.features).toEqual([]);
  });

  test('the accepted change shows up in the catalogue and the search', async () => {
    await seedLanguage('spanish');
    const { admin, request } = await pendingRequest();

    await api('PUT', `/lang/change-requests/${request.id}/accept`, {
      token: admin.token,
    });

    const all = await api('GET', '/lang');
    expect(all.body[0].features).toEqual(['tones']);
  });
});

describe('PUT /lang/change-requests/:id/reject', () => {
  async function pendingRequest() {
    const author = await createTestUser({ nickname: 'ana' });
    const admin = await createTestAdmin();
    const request = await seedChangeRequest({
      userId: author.user.id,
      locale: 'pt',
    });

    return { author, admin, request };
  }

  test('requires a session', async () => {
    const { request } = await pendingRequest();

    const res = await api('PUT', `/lang/change-requests/${request.id}/reject`, {
      body: { reason: 'No sources' },
    });

    expect(res.status).toBe(401);
  });

  test('is only for administrators', async () => {
    const { author, request } = await pendingRequest();

    const res = await api('PUT', `/lang/change-requests/${request.id}/reject`, {
      token: author.token,
      body: { reason: 'No sources' },
    });

    expect(res.status).toBe(403);
  });

  test('rejects the request with its reason and leaves the language alone', async () => {
    await seedLanguage('spanish', { features: ['svo'] });
    const { admin, request } = await pendingRequest();

    const res = await api('PUT', `/lang/change-requests/${request.id}/reject`, {
      token: admin.token,
      body: { reason: '  No sources  ' },
    });

    expect(res.status).toBe(200);
    expect(res.body.request).toMatchObject({
      state: 'rejected',
      rejectionReason: 'No sources',
    });
    expect(await getStoredLanguage('spanish')).toMatchObject({
      features: ['svo'],
      partial: [],
    });

    const [stored] = await db.select().from(changeRequestTable);
    expect(stored).toMatchObject({
      state: 'rejected',
      reviewedBy: admin.user.id,
    });
  });

  test('tells the author by email, with the reason', async () => {
    await seedLanguage('spanish');
    const { author, admin, request } = await pendingRequest();

    await api('PUT', `/lang/change-requests/${request.id}/reject`, {
      token: admin.token,
      body: { reason: 'No sources' },
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const email = vi.mocked(sendEmail).mock.calls[0][0];
    expect(email.to).toBe(author.user.email);
    expect(email.subject).toContain('rejeitado');
    expect(email.react.props).toMatchObject({
      state: 'rejected',
      reason: 'No sources',
    });
  });

  test('the author sees the reason in their requests', async () => {
    const { author, admin, request } = await pendingRequest();

    await api('PUT', `/lang/change-requests/${request.id}/reject`, {
      token: admin.token,
      body: { reason: 'No sources' },
    });

    const mine = await api('GET', '/lang/change-requests/mine', {
      token: author.token,
    });
    expect(mine.body[0]).toMatchObject({
      state: 'rejected',
      rejectionReason: 'No sources',
    });
  });

  test('works even when the language no longer exists', async () => {
    const { admin, request } = await pendingRequest();

    const res = await api('PUT', `/lang/change-requests/${request.id}/reject`, {
      token: admin.token,
      body: { reason: 'Gone' },
    });

    expect(res.status).toBe(200);
  });

  test.each([
    ['no body', undefined],
    ['no reason', {}],
    ['an empty reason', { reason: '' }],
    ['a blank reason', { reason: '   ' }],
    ['a reason over 500 characters', { reason: 'x'.repeat(501) }],
  ])('needs a reason: %s', async (_, reqBody) => {
    const { admin, request } = await pendingRequest();

    const res = await api('PUT', `/lang/change-requests/${request.id}/reject`, {
      token: admin.token,
      body: reqBody,
    });

    expect(res.status).toBe(400);
    const [stored] = await db.select().from(changeRequestTable);
    expect(stored.state).toBe('pending');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  test('answers 404 for a request that does not exist', async () => {
    const admin = await createTestAdmin();

    const res = await api(
      'PUT',
      `/lang/change-requests/${crypto.randomUUID()}/reject`,
      { token: admin.token, body: { reason: 'No sources' } },
    );

    expect(res.status).toBe(404);
    expect(res.body.key).toBe('requestNotFound');
  });

  test('cannot be resolved twice', async () => {
    const { admin, request } = await pendingRequest();
    const path = `/lang/change-requests/${request.id}/reject`;

    await api('PUT', path, { token: admin.token, body: { reason: 'First' } });
    const again = await api('PUT', path, {
      token: admin.token,
      body: { reason: 'Second' },
    });

    expect(again.status).toBe(409);
    const [stored] = await db.select().from(changeRequestTable);
    expect(stored.rejectionReason).toBe('First');
  });

  test('an accepted request cannot be rejected afterwards', async () => {
    await seedLanguage('spanish');
    const { admin, request } = await pendingRequest();

    await api('PUT', `/lang/change-requests/${request.id}/accept`, {
      token: admin.token,
    });
    const res = await api('PUT', `/lang/change-requests/${request.id}/reject`, {
      token: admin.token,
      body: { reason: 'Changed my mind' },
    });

    expect(res.status).toBe(409);
    const [stored] = await db.select().from(changeRequestTable);
    expect(stored).toMatchObject({ state: 'accepted', rejectionReason: null });
  });
});

describe('when the language store fails', () => {
  test('a failed write releases the request so it can be retried', async () => {
    await seedLanguage('spanish');
    const author = await createTestUser();
    const admin = await createTestAdmin();
    const request = await seedChangeRequest({ userId: author.user.id });
    const client = await getClient();

    // Redis refuses to write a JSON document through a key of another type.
    const original = client.json.get.bind(client.json);
    vi.spyOn(client.json, 'set').mockRejectedValue(new Error('READONLY'));
    vi.spyOn(client.json, 'get').mockImplementation(original);

    const res = await api('PUT', `/lang/change-requests/${request.id}/accept`, {
      token: admin.token,
    });

    expect(res.status).toBe(500);
    expect(res.body.key).toBe('unknown');

    const [stored] = await db.select().from(changeRequestTable);
    expect(stored).toMatchObject({
      state: 'pending',
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
    });
    expect(sendEmail).not.toHaveBeenCalled();

    vi.restoreAllMocks();
    const retry = await api(
      'PUT',
      `/lang/change-requests/${request.id}/accept`,
      { token: admin.token },
    );
    expect(retry.status).toBe(200);
  });
});
