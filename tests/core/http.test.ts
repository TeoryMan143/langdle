import { Hono } from 'hono';
import { expect, test } from 'vitest';
import { parseJsonBody } from '@/core/lib/http';
import { signInSchema } from '@/modules/auth/schemas/signin';
import { signUpSchema } from '@/modules/auth/schemas/signup';

const app = new Hono()
  .post('/signin', async c => {
    const parsed = await parseJsonBody(c, signInSchema);

    return parsed.success ? c.json(parsed.data) : parsed.response;
  })
  .post('/signup', async c => {
    const parsed = await parseJsonBody(c, signUpSchema);

    return parsed.success ? c.json(parsed.data) : parsed.response;
  });

const post = (path: string, body: string) =>
  app.request(path, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  });

test('answers the parsed data of a valid body', async () => {
  const res = await post(
    '/signin',
    JSON.stringify({ nickname: ' ana ', password: 'secret', extra: true }),
  );

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ nickname: 'ana', password: 'secret' });
});

test('a body that is not JSON answers invalidBody', async () => {
  const res = await post('/signin', 'not json');

  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({
    key: 'invalidBody',
    message: 'A JSON body is required',
  });
});

// The clients (web forms and the mobile app) read `errors.fieldErrors` and
// show its messages, so this exact shape is part of the API contract.
test('an invalid body answers invalidData with the flattened errors', async () => {
  const res = await post(
    '/signin',
    JSON.stringify({ nickname: '', password: '' }),
  );

  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({
    key: 'invalidData',
    message: 'An error occurred parsing the body data',
    errors: {
      formErrors: [],
      fieldErrors: {
        nickname: ['Nickname required'],
        password: ['Password required'],
      },
    },
  });
});

test('an error of a refinement lands on the field of its path', async () => {
  const res = await post(
    '/signup',
    JSON.stringify({
      nickname: 'ana',
      email: 'ana@langdle.test',
      password: 'password123',
      confirmPassword: 'password456',
      country: 'CO',
    }),
  );

  expect((await res.json()).errors).toEqual({
    formErrors: [],
    fieldErrors: { confirmPassword: ['Passwords do not match'] },
  });
});

test('a body that is not an object is a form error', async () => {
  const res = await post('/signin', JSON.stringify('text'));
  const { errors } = await res.json();

  expect(res.status).toBe(400);
  expect(errors.fieldErrors).toEqual({});
  expect(errors.formErrors).toEqual([expect.any(String)]);
});
