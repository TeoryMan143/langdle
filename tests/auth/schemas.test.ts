import { describe, expect, test } from 'vitest';
import {
  googleDataSchema,
  googleSignUpSchema,
} from '@/modules/auth/schemas/google-data';
import { oauthTokenSchema } from '@/modules/auth/schemas/oauth-token';
import { signInSchema } from '@/modules/auth/schemas/signin';
import { signUpSchema } from '@/modules/auth/schemas/signup';
import { fieldErrorsOf } from '../support/schemas';

const signUp = {
  nickname: 'ana',
  email: 'ana@langdle.test',
  password: 'password123',
  confirmPassword: 'password123',
  country: 'CO',
};

/** The messages a schema answers for one field of an invalid input. */
function fieldErrors(
  schema: typeof signUpSchema | typeof signInSchema | typeof googleSignUpSchema,
  input: unknown,
): Record<string, string[] | undefined> {
  const result = schema.safeParse(input);

  if (result.success) {
    throw new Error('the input was expected to be invalid');
  }

  return fieldErrorsOf(result);
}

describe('signUpSchema', () => {
  test('accepts a complete sign up and answers exactly its fields', () => {
    expect(signUpSchema.parse(signUp)).toEqual(signUp);
  });

  test('trims the nickname, the email and both passwords', () => {
    expect(
      signUpSchema.parse({
        ...signUp,
        nickname: '  ana  ',
        password: ' password123 ',
        confirmPassword: ' password123 ',
      }),
    ).toEqual(signUp);
  });

  test('drops the fields only the server may set', () => {
    const parsed = signUpSchema.parse({
      ...signUp,
      id: '00000000-0000-4000-8000-000000000000',
      admin: true,
      googleId: 'google-sub',
      nativeLanguage: 'spanish',
      fluent: 'english',
      somethingElse: 1,
    });

    expect(parsed).toEqual(signUp);
  });

  test.each([
    ['nickname', 'ab', 'Nickname must be at least 3 characters long'],
    ['nickname', 'a'.repeat(21), 'Nickname must be at most 20 characters long'],
    ['email', 'not-an-email', 'It must be a valid email'],
    [
      'email',
      `${'a'.repeat(250)}@langdle.test`,
      'Email must be at most 254 characters long',
    ],
    ['password', 'short', 'Password must be at least 8 characters long'],
    [
      'password',
      'a'.repeat(101),
      'Password must be at most 100 characters long',
    ],
    ['country', '', 'Country is required'],
  ])('rejects the %s "%s" with its own message', (field, value, message) => {
    expect(
      fieldErrors(signUpSchema, { ...signUp, [field]: value })[field],
    ).toContain(message);
  });

  test('accepts the bounds of every length limit', () => {
    for (const override of [
      { nickname: 'abc' },
      { nickname: 'a'.repeat(20) },
      { password: 'a'.repeat(8), confirmPassword: 'a'.repeat(8) },
      { password: 'a'.repeat(100), confirmPassword: 'a'.repeat(100) },
    ]) {
      expect(signUpSchema.safeParse({ ...signUp, ...override }).success).toBe(
        true,
      );
    }
  });

  test.each([
    'ana@langdle.test',
    'ANA@LANGDLE.TEST',
    'ana.maria+tag@mail.example.co',
    "o'neil@example.com",
    'a_b-c@sub-domain.example.org',
  ])('accepts the email %s', email => {
    expect(signUpSchema.safeParse({ ...signUp, email }).success).toBe(true);
  });

  test.each([
    'ana',
    'ana@',
    '@langdle.test',
    'ana@langdle',
    'ana@langdle.t',
    '.ana@langdle.test',
    'ana..maria@langdle.test',
    'ana maria@langdle.test',
    'ana@lang_dle.test',
  ])('rejects the email %s', email => {
    expect(signUpSchema.safeParse({ ...signUp, email }).success).toBe(false);
  });

  test('a confirmation that differs is an error of confirmPassword', () => {
    expect(
      fieldErrors(signUpSchema, { ...signUp, confirmPassword: 'password456' }),
    ).toEqual({ confirmPassword: ['Passwords do not match'] });
  });

  test('every required field is reported when the body is empty', () => {
    expect(Object.keys(fieldErrors(signUpSchema, {})).sort()).toEqual([
      'confirmPassword',
      'country',
      'email',
      'nickname',
      'password',
    ]);
  });

  test.each([null, 'text', 42, []])('rejects %j as a body', body => {
    expect(signUpSchema.safeParse(body).success).toBe(false);
  });

  test.each([
    ['nickname', 42],
    ['email', null],
    ['password', true],
    ['country', ['CO']],
  ])('rejects a %s that is not a string', (field, value) => {
    expect(
      fieldErrors(signUpSchema, { ...signUp, [field]: value }),
    ).toHaveProperty(field);
  });
});

describe('signInSchema', () => {
  test('accepts and trims the credentials', () => {
    expect(
      signInSchema.parse({ nickname: ' ana ', password: ' secret ', x: 1 }),
    ).toEqual({ nickname: 'ana', password: 'secret' });
  });

  test('answers its own messages for empty credentials', () => {
    expect(fieldErrors(signInSchema, { nickname: '', password: '' })).toEqual({
      nickname: ['Nickname required'],
      password: ['Password required'],
    });
  });

  test('reports both fields when they are missing', () => {
    expect(Object.keys(fieldErrors(signInSchema, {})).sort()).toEqual([
      'nickname',
      'password',
    ]);
  });
});

describe('googleDataSchema', () => {
  test('lets the nickname be empty but not the country', () => {
    expect(googleDataSchema.parse({ nickname: '', country: 'CO' })).toEqual({
      nickname: '',
      country: 'CO',
    });

    const result = googleDataSchema.safeParse({ nickname: '', country: '' });

    expect(result.success).toBe(false);
    expect(fieldErrorsOf(result)).toEqual({
      country: ['Country required'],
    });
  });

  test('the API schema also needs the data token', () => {
    const body = { nickname: 'ana', country: 'CO', dataToken: 'token' };

    expect(googleSignUpSchema.parse({ ...body, extra: true })).toEqual(body);
    expect(fieldErrors(googleSignUpSchema, { ...body, dataToken: '' })).toEqual(
      { dataToken: ['dataToken required'] },
    );
    expect(
      fieldErrors(googleSignUpSchema, { nickname: 'ana', country: 'CO' }),
    ).toHaveProperty('dataToken');
  });
});

describe('oauthTokenSchema', () => {
  test('needs the id token, the nickname is optional', () => {
    expect(oauthTokenSchema.parse({ idToken: 'jwt' })).toEqual({
      idToken: 'jwt',
    });
    expect(oauthTokenSchema.parse({ idToken: 'jwt', nickname: 'ana' })).toEqual(
      { idToken: 'jwt', nickname: 'ana' },
    );

    const result = oauthTokenSchema.safeParse({ idToken: '' });

    expect(fieldErrorsOf(result)).toEqual({
      idToken: ['idToken required'],
    });
    expect(oauthTokenSchema.safeParse({}).success).toBe(false);
    expect(
      oauthTokenSchema.safeParse({ idToken: 'jwt', nickname: 1 }).success,
    ).toBe(false);
  });
});
