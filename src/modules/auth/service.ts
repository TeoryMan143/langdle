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
import { sessionTable, userTable } from '@/core/database/relational/tables';
import { SESSION_DURATION_MS } from '@/core/lib/session-config';
import type {
  CachedSession,
  GoogleSignupPayload,
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
 * Google accounts missing from our database are redirected to a page that asks
 * for the remaining data. The claims travel in this encrypted token so they
 * cannot be tampered with by the client.
 */
export function encodeGoogleSignupToken(payload: GoogleSignupPayload) {
  return new jose.EncryptJWT({ ...payload })
    .setExpirationTime('30m')
    .setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512' })
    .encrypt(getJwtSecret());
}

export async function decodeGoogleSignupToken(token: string) {
  try {
    const { payload } = await jose.jwtDecrypt<GoogleSignupPayload>(
      token,
      getJwtSecret(),
    );

    return {
      nickname: payload.nickname,
      googleId: payload.googleId,
      email: payload.email,
    };
  } catch (_) {
    return null;
  }
}
