import { sha256 } from '@oslojs/crypto/sha2';
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from '@oslojs/encoding';
import { Google, generateCodeVerifier, generateState } from 'arctic';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import * as jose from 'jose';
import {
  deleteKeys,
  getStringByKey,
  setStringToKey,
} from '@/core/database/redis/key-getters';
import { db } from '@/core/database/relational/config';
import {
  changeRequestTable,
  langPermissionTable,
  sessionTable,
  userTable,
} from '@/core/database/relational/tables';
import { SESSION_DURATION_MS } from '@/core/lib/session-config';
import type {
  CachedSession,
  OAuthIdentity,
  OAuthProvider,
  OAuthSignupPayload,
  Session,
  SessionValidationResult,
  User,
} from './types';

/** A session is renewed once it is within this window of its expiry. */
const SESSION_RENEW_THRESHOLD_MS = SESSION_DURATION_MS / 2;

/**
 * Validated sessions are cached in Redis at `session:<sessionId>` (the hashed
 * token, never the token itself). Postgres stays the source of truth: the
 * cache is filled on the first validation, evicted when a session or its user
 * changes, and expires on its own after this long so anything changed behind
 * the services' back (an admin flag set by hand) is picked up soon enough.
 */
const SESSION_CACHE_GROUP = 'session';
const SESSION_CACHE_TTL_S = 60 * 5;

const { password: _password, ...userTableWithoutPassword } = userTable;

/* -------------------------------------------------------------------------- */
/*                                  Sessions                                  */
/* -------------------------------------------------------------------------- */

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

function hashToken(token: string) {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function createSession(
  token: string,
  userId: string,
): Promise<Session> {
  const session: Session = {
    id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  };
  await db.insert(sessionTable).values(session);
  return session;
}

const sessionCacheKey = (sessionId: string) =>
  `${SESSION_CACHE_GROUP}:${sessionId}`;

async function readCachedSession(
  sessionId: string,
): Promise<CachedSession | null> {
  const raw = await getStringByKey(sessionCacheKey(sessionId));

  if (!raw) {
    return null;
  }

  try {
    const { session, user } = JSON.parse(raw) as CachedSession;
    return {
      session: { ...session, expiresAt: new Date(session.expiresAt) },
      user,
    };
  } catch (_) {
    return null;
  }
}

async function cacheSession(entry: CachedSession) {
  const ttlSeconds = Math.min(
    SESSION_CACHE_TTL_S,
    Math.floor((entry.session.expiresAt.getTime() - Date.now()) / 1000),
  );

  if (ttlSeconds > 0) {
    await setStringToKey(
      sessionCacheKey(entry.session.id),
      JSON.stringify(entry),
      ttlSeconds,
    );
  }
}

async function getSessionFromDatabase(
  sessionId: string,
): Promise<CachedSession | null> {
  const [result] = await db
    .select({
      user: userTableWithoutPassword,
      session: sessionTable,
    })
    .from(sessionTable)
    .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
    .where(eq(sessionTable.id, sessionId));

  return result ?? null;
}

/**
 * Redis is only a cache here: when it is down every helper reports a miss or
 * a failed write and validation falls back to Postgres.
 */
export async function validateSessionToken(
  token: string,
): Promise<SessionValidationResult> {
  const sessionId = hashToken(token);

  let entry = await readCachedSession(sessionId);
  const cached = entry !== null;
  entry ??= await getSessionFromDatabase(sessionId);

  if (!entry) {
    return { session: null, user: null };
  }

  const { session, user } = entry;

  if (Date.now() >= session.expiresAt.getTime()) {
    await invalidateSession(session.id);
    return { session: null, user: null };
  }

  if (Date.now() >= session.expiresAt.getTime() - SESSION_RENEW_THRESHOLD_MS) {
    session.expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await db
      .update(sessionTable)
      .set({ expiresAt: session.expiresAt })
      .where(eq(sessionTable.id, session.id));
    await cacheSession(entry);
  } else if (!cached) {
    await cacheSession(entry);
  }

  return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
  await deleteKeys([sessionCacheKey(sessionId)]);
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  const sessions = await db
    .delete(sessionTable)
    .where(eq(sessionTable.userId, userId))
    .returning({ id: sessionTable.id });
  await deleteKeys(sessions.map(({ id }) => sessionCacheKey(id)));
}

/**
 * Drops the cached copies of a user's sessions without signing them out. Any
 * service that changes a user row calls it, so the next request reads the new
 * user from Postgres instead of the stale one cached with the session.
 */
export async function evictUserSessionsCache(userId: string): Promise<void> {
  const sessions = await db
    .select({ id: sessionTable.id })
    .from(sessionTable)
    .where(eq(sessionTable.userId, userId));
  await deleteKeys(sessions.map(({ id }) => sessionCacheKey(id)));
}

/* -------------------------------------------------------------------------- */
/*                                    Users                                   */
/* -------------------------------------------------------------------------- */

export function hashPassword(password: string) {
  return argon2.hash(password);
}

export function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

export async function createUser(values: {
  nickname: string;
  email: string;
  country: string;
  password?: string | null;
  googleId?: string | null;
  appleId?: string | null;
}): Promise<User | undefined> {
  const [newUser] = await db.insert(userTable).values(values).returning();
  return newUser;
}

export async function getUserByNickname(nickname: string) {
  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.nickname, nickname))
    .limit(1);

  return user;
}

export async function getUserByGoogleId(googleId: string) {
  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.googleId, googleId))
    .limit(1);

  return user;
}

export async function getUserByAppleId(appleId: string) {
  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.appleId, appleId))
    .limit(1);

  return user;
}

export function getUserByProviderId(provider: OAuthProvider, id: string) {
  return provider === 'google' ? getUserByGoogleId(id) : getUserByAppleId(id);
}

/**
 * Deletes the account and everything it owns. Sessions and game history go
 * with the row (cascade); permissions and change requests are removed by hand
 * and reviews the user made lose their reviewer.
 */
export async function deleteUser(userId: string): Promise<void> {
  await invalidateAllSessions(userId);
  await db.batch([
    db
      .update(changeRequestTable)
      .set({ reviewedBy: null })
      .where(eq(changeRequestTable.reviewedBy, userId)),
    db.delete(changeRequestTable).where(eq(changeRequestTable.userId, userId)),
    db
      .delete(langPermissionTable)
      .where(eq(langPermissionTable.userId, userId)),
    db.delete(userTable).where(eq(userTable.id, userId)),
  ]);
}

export function toUserDTO(user: User) {
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/* -------------------------------------------------------------------------- */
/*                                Google OAuth                                */
/* -------------------------------------------------------------------------- */

export const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';

export const google = new Google(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_BASE_URL}${GOOGLE_CALLBACK_PATH}`,
);

export function createGoogleAuthorization() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, [
    'openid',
    'profile',
    'email',
  ]);

  return { state, codeVerifier, url: url.toString() };
}

function getJwtSecret() {
  return jose.base64url.decode(process.env.JWT_SECRET);
}

/**
 * OAuth accounts missing from our database are sent to a step that asks for
 * the remaining data. The claims travel in this encrypted token so they cannot
 * be tampered with by the client.
 */
export function encodeOAuthSignupToken(payload: OAuthSignupPayload) {
  return new jose.EncryptJWT({ ...payload })
    .setExpirationTime('30m')
    .setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
    .encrypt(getJwtSecret());
}

export async function decodeOAuthSignupToken(
  token: string,
): Promise<OAuthSignupPayload | null> {
  try {
    const { payload } = await jose.jwtDecrypt<OAuthSignupPayload>(
      token,
      getJwtSecret(),
    );

    if (
      (payload.provider !== 'google' && payload.provider !== 'apple') ||
      !payload.providerId ||
      !payload.email
    ) {
      return null;
    }

    return {
      provider: payload.provider,
      providerId: payload.providerId,
      nickname: payload.nickname ?? '',
      email: payload.email,
    };
  } catch (_) {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                         Native ID tokens (mobile)                          */
/* -------------------------------------------------------------------------- */

/**
 * Key sets the ID tokens are verified against. A mutable object so tests can
 * swap them for local keys.
 */
export const oauthKeySets: Record<OAuthProvider, jose.JWTVerifyGetKey> = {
  google: jose.createRemoteJWKSet(
    new URL('https://www.googleapis.com/oauth2/v3/certs'),
  ),
  apple: jose.createRemoteJWKSet(
    new URL('https://appleid.apple.com/auth/keys'),
  ),
};

const OAUTH_ISSUERS: Record<OAuthProvider, string[]> = {
  google: ['https://accounts.google.com', 'accounts.google.com'],
  apple: ['https://appleid.apple.com'],
};

const splitIds = (value?: string) =>
  (value ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

function oauthAudiences(provider: OAuthProvider) {
  return provider === 'google'
    ? [
        process.env.GOOGLE_CLIENT_ID,
        ...splitIds(process.env.GOOGLE_MOBILE_CLIENT_IDS),
      ]
    : splitIds(process.env.APPLE_CLIENT_IDS);
}

/**
 * Verifies an ID token issued to one of our apps by the native Google / Apple
 * SDKs. `null` for anything that is not a valid token addressed to us.
 */
export async function verifyOAuthIdToken(
  provider: OAuthProvider,
  idToken: string,
): Promise<OAuthIdentity | null> {
  const audience = oauthAudiences(provider);

  if (audience.length === 0) {
    return null;
  }

  try {
    const { payload } = await jose.jwtVerify<{
      email?: string;
      email_verified?: boolean | string;
      name?: string;
    }>(idToken, oauthKeySets[provider], {
      issuer: OAUTH_ISSUERS[provider],
      audience,
    });

    if (!payload.sub) {
      return null;
    }

    const emailVerified =
      payload.email_verified === true || payload.email_verified === 'true';

    return {
      providerId: payload.sub,
      email: payload.email && emailVerified ? payload.email : undefined,
      name: payload.name,
    };
  } catch (_) {
    return null;
  }
}
