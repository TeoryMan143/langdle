import { zodResolver } from '@hookform/resolvers/zod';
import { expect, test } from 'vitest';
import { signUpSchema } from '@/modules/auth/schemas/signup';
import { createRejectChangeRequestSchema } from '@/modules/lang-data/schemas/change-request';

/**
 * The forms validate through `zodResolver(schema)`. This pins what
 * react-hook-form receives from it: the parsed values, or one error per field
 * carrying the message of the schema.
 */
const options = { fields: {}, shouldUseNativeValidation: false };

const signUp = {
  nickname: 'ana',
  email: 'ana@langdle.test',
  password: 'password123',
  confirmPassword: 'password123',
  country: 'CO',
};

test('valid values come back parsed and without errors', async () => {
  const result = await zodResolver(signUpSchema)(
    { ...signUp, nickname: '  ana ' },
    undefined,
    options,
  );

  expect(result).toEqual({ values: signUp, errors: {} });
});

test('invalid values come back as one error per field', async () => {
  const result = await zodResolver(signUpSchema)(
    { ...signUp, nickname: 'ab', country: '' },
    undefined,
    options,
  );

  expect(result.values).toEqual({});
  expect(Object.keys(result.errors).sort()).toEqual(['country', 'nickname']);
  expect(result.errors.nickname).toMatchObject({
    message: 'Nickname must be at least 3 characters long',
  });
  expect(result.errors.country).toMatchObject({
    message: 'Country is required',
  });
});

test('the error of a refinement is attached to its field', async () => {
  const result = await zodResolver(signUpSchema)(
    { ...signUp, confirmPassword: 'password456' },
    undefined,
    options,
  );

  expect(result.errors).toEqual({
    confirmPassword: expect.objectContaining({
      message: 'Passwords do not match',
    }),
  });
});

test('a schema built with a translator reports the translated message', async () => {
  const schema = createRejectChangeRequestSchema(key => `translated:${key}`);
  const result = await zodResolver(schema)({ reason: ' ' }, undefined, options);

  expect(result.errors.reason).toMatchObject({
    message: 'translated:reasonRequired',
  });
});
