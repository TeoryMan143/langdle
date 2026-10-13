import { NeonDbError } from '@neondatabase/serverless';
import { decodeIdToken, type OAuth2Tokens } from 'arctic';
import { type Context, Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { apiError, parseJsonBody, unknownError } from '@/core/lib/http';
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@/core/lib/session-config';
import { authMiddleware } from './middleware';
import { googleSignUpSchema } from './schemas/google-data';
import { oauthTokenSchema } from './schemas/oauth-token';
import { signInSchema } from './schemas/signin';
import { signUpSchema } from './schemas/signup';
import {
  createGoogleAuthorization,
  createSession,
  createUser,
  decodeOAuthSignupToken,
  deleteUser,
  encodeOAuthSignupToken,
  generateSessionToken,
  getUserByNickname,
  getUserByProviderId,
  google,
  hashPassword,
  invalidateSession,
  toUserDTO,
  verifyOAuthIdToken,
  verifyPassword,
} from './service';
import type {
  AuthPayload,
  OAuthProvider,
  OAuthSignupPayload,
  OAuthTokenResult,
  User,
} from './types';

const OAUTH_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 10,
  sameSite: 'Lax',
} as const;

/** The unique constraints a signup can break, and what the client is told. */
const SIGNUP_CONFLICTS: Record<string, { key: string; message: string }> = {
  user_nickname_unique: {
    key: 'nicknameAlreadyExists',
    message: 'That nickname is already taken',
  },
  user_email_unique: {
    key: 'emailAlreadyExists',
    message: 'That email is already registered',
  },
};

/** The `409` for a taken nickname or email, `null` for any other failure. */
function signupConflict(c: Context, error: unknown) {
  const conflict =
    error instanceof NeonDbError && error.constraint
      ? SIGNUP_CONFLICTS[error.constraint]
      : undefined;

  return conflict ? apiError(c, 409, conflict.key, conflict.message) : null;
}

async function openSession(user: User): Promise<AuthPayload> {
  const token = generateSessionToken();
  const session = await createSession(token, user.id);

  return {
    user: toUserDTO(user),
    token,
    expiresAt: session.expiresAt.toISOString(),
  };
}

/**
 * The step every OAuth flow shares: a known account gets a session, an unknown
 * one the encrypted token that finishes its sign up.
 */
async function resolveOAuthAccount(
  claims: OAuthSignupPayload,
): Promise<OAuthTokenResult> {
  const existingUser = await getUserByProviderId(
    claims.provider,
    claims.providerId,
  );

  if (existingUser) {
    return { status: 'signedIn', ...(await openSession(existingUser)) };
  }

  return {
    status: 'needsSignup',
    dataToken: await encodeOAuthSignupToken(claims),
    nickname: claims.nickname,
    email: claims.email,
  };
}

/** Native sign in: verifies the ID token a Google / Apple SDK handed the app. */
const oauthTokenHandler = (provider: OAuthProvider) => async (c: Context) => {
  const parsed = await parseJsonBody(c, oauthTokenSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const identity = await verifyOAuthIdToken(provider, parsed.data.idToken);

  if (!identity) {
    return apiError(c, 401, 'invalidToken', 'The ID token is not valid');
  }

  try {
    const existingUser = await getUserByProviderId(
      provider,
      identity.providerId,
    );

    if (!existingUser && !identity.email) {
      return apiError(
        c,
        400,
        'missingEmail',
        'The account has no verified email',
      );
    }

    return c.json(
      await resolveOAuthAccount({
        provider,
        providerId: identity.providerId,
        nickname: parsed.data.nickname ?? identity.name ?? '',
        email: identity.email ?? '',
      }),
    );
  } catch (e) {
    console.error(e);
    return unknownError(c, 'The account could not be processed');
  }
};

const authRouter = new Hono();

authRouter.post('/signup', async c => {
  const parsed = await parseJsonBody(c, signUpSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const { confirmPassword: _, ...userData } = parsed.data;

  try {
    const newUser = await createUser({
      ...userData,
      password: await hashPassword(userData.password),
    });

    if (!newUser) {
      return apiError(c, 500, 'failedCreateUser', 'The user was not created');
    }

    return c.json(await openSession(newUser), 201);
  } catch (e) {
    console.error(e);

    return (
      signupConflict(c, e) ??
      apiError(c, 500, 'unknownSu', 'The user could not be created')
    );
  }
});

authRouter.post('/signin', async c => {
  const parsed = await parseJsonBody(c, signInSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const { nickname, password } = parsed.data;

  try {
    const user = await getUserByNickname(nickname);

    if (!user?.password || !(await verifyPassword(user.password, password))) {
      return apiError(
        c,
        401,
        'invalidUserPassword',
        'Invalid nickname or password',
      );
    }

    return c.json(await openSession(user));
  } catch (e) {
    console.error(e);
    return apiError(c, 500, 'unknownSi', 'The session could not be created');
  }
});

authRouter.post('/signout', authMiddleware, async c => {
  try {
    await invalidateSession(c.get('session').id);
    return c.json({ success: true });
  } catch (e) {
    console.error(e);
    return unknownError(c, 'The session could not be closed');
  }
});

authRouter.get('/me', authMiddleware, c => c.json(c.get('user')));

/** Deletes the signed in account and everything it owns. */
authRouter.delete('/me', authMiddleware, async c => {
  try {
    await deleteUser(c.get('user').id);
    return c.json({ success: true });
  } catch (e) {
    console.error(e);
    return unknownError(c, 'The account could not be deleted');
  }
});

/* -------------------------------------------------------------------------- */
/*                                Google OAuth                                */
/* -------------------------------------------------------------------------- */

authRouter.get('/google', c => {
  const { state, codeVerifier, url } = createGoogleAuthorization();

  setCookie(c, 'google_oauth_state', state, OAUTH_COOKIE_OPTIONS);
  setCookie(c, 'google_code_verifier', codeVerifier, OAUTH_COOKIE_OPTIONS);

  return c.redirect(url);
});

authRouter.get('/google/callback', async c => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const storedState = getCookie(c, 'google_oauth_state');
  const codeVerifier = getCookie(c, 'google_code_verifier');

  if (!code || !state || !storedState || !codeVerifier) {
    return apiError(c, 400, 'invalidCallback', 'Missing OAuth parameters');
  }

  if (state !== storedState) {
    return apiError(c, 400, 'invalidState', 'OAuth state mismatch');
  }

  deleteCookie(c, 'google_oauth_state', { path: '/' });
  deleteCookie(c, 'google_code_verifier', { path: '/' });

  let tokens: OAuth2Tokens;

  try {
    tokens = await google.validateAuthorizationCode(code, codeVerifier);
  } catch (_) {
    return apiError(c, 400, 'invalidCode', 'Invalid code or credentials');
  }

  const claims = decodeIdToken(tokens.idToken()) as {
    sub: string;
    name: string;
    email: string;
  };

  try {
    const result = await resolveOAuthAccount({
      provider: 'google',
      providerId: claims.sub,
      nickname: claims.name,
      email: claims.email,
    });

    if (result.status === 'signedIn') {
      setCookie(
        c,
        SESSION_COOKIE,
        result.token,
        sessionCookieOptions(new Date(result.expiresAt)),
      );

      return c.redirect('/');
    }

    return c.redirect(`/endgoogle?data=${result.dataToken}`);
  } catch (e) {
    console.error(e);
    return unknownError(c, 'The Google account could not be processed');
  }
});

authRouter.post('/google/token', oauthTokenHandler('google'));
authRouter.post('/apple/token', oauthTokenHandler('apple'));

/** The claims inside a sign up token, to prefill the form that finishes it. */
authRouter.get('/oauth/signup-data', async c => {
  const claims = await decodeOAuthSignupToken(c.req.query('token') ?? '');

  if (!claims) {
    return apiError(c, 400, 'invalidToken', 'The signup token is not valid');
  }

  return c.json({
    provider: claims.provider,
    nickname: claims.nickname,
    email: claims.email,
  });
});

/** Finishes an OAuth sign up with the data the user completed by hand. */
async function oauthSignupHandler(c: Context) {
  const parsed = await parseJsonBody(c, googleSignUpSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const { dataToken, nickname, country } = parsed.data;

  const claims = await decodeOAuthSignupToken(dataToken);

  if (!claims) {
    return apiError(c, 400, 'invalidToken', 'The signup token is not valid');
  }

  try {
    const newUser = await createUser({
      nickname: nickname.length > 0 ? nickname : claims.nickname,
      email: claims.email,
      googleId: claims.provider === 'google' ? claims.providerId : null,
      appleId: claims.provider === 'apple' ? claims.providerId : null,
      country,
      password: null,
    });

    if (!newUser) {
      return apiError(c, 500, 'failedCreateUser', 'The user was not created');
    }

    return c.json(await openSession(newUser), 201);
  } catch (e) {
    console.error(e);

    return (
      signupConflict(c, e) ??
      apiError(c, 500, 'unknownSu', 'The user could not be created')
    );
  }
}

authRouter.post('/oauth/signup', oauthSignupHandler);
/** Kept for the web flow and older clients. */
authRouter.post('/google/signup', oauthSignupHandler);

export default authRouter;
