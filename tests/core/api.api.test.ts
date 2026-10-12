import { describe, expect, test } from 'vitest';
import { api } from '../support/api';
import { createTestUser } from '../support/factories';

describe('the API entry point', () => {
  test.each([
    ['GET', '/nothing'],
    ['GET', '/auth/nothing'],
    ['POST', '/lang/nothing/at/all'],
    ['GET', '/unknown-module/me'],
  ] as const)('%s %s answers 404', async (method, path) => {
    const res = await api(method, path);

    expect(res.status).toBe(404);
  });

  test('every module is mounted under its own prefix', async () => {
    const { token, user } = await createTestUser();

    const responses = await Promise.all([
      api('GET', '/auth/me', { token }),
      api('GET', `/user/${user.id}`),
      api('GET', '/guess/history', { token }),
      api('GET', '/lang/change-requests/mine', { token }),
    ]);

    expect(responses.map(res => res.status)).toEqual([200, 200, 200, 200]);
  });

  test('static paths win over the dynamic ones', async () => {
    const { token } = await createTestUser();

    // would be read as language ids ("random", "change-requests"…) otherwise
    const random = await api('GET', '/lang/random');
    const requests = await api('GET', '/lang/change-requests');
    const mine = await api('GET', '/lang/change-requests/mine', { token });
    const history = await api('GET', '/guess/history');

    expect(random.body.key).toBe('notFound');
    expect(random.body.message).toBe('There are no active languages');
    expect(requests.status).toBe(401);
    expect(mine.status).toBe(200);
    expect(history.status).toBe(401);
  });

  test('every failure answers { key, message }', async () => {
    const failures = await Promise.all([
      api('GET', '/auth/me'),
      api('POST', '/auth/signin', { body: {} }),
      api('POST', '/auth/signup', { rawBody: 'x' }),
      api('GET', '/lang/klingon'),
      api('GET', '/lang/jobs/cleanup-tokens'),
    ]);

    for (const res of failures) {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.key).toEqual(expect.any(String));
      expect(res.body.message).toEqual(expect.any(String));
    }
  });

  test('a validation failure carries the flattened zod errors', async () => {
    const res = await api('POST', '/auth/signin', { body: {} });

    expect(res.body.errors.fieldErrors).toEqual({
      nickname: expect.any(Array),
      password: expect.any(Array),
    });
  });
});
