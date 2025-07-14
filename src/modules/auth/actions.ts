'use server';

import { NeonDbError } from '@neondatabase/serverless';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { type typeToFlattenedError } from 'zod';
import { ActionResult, actionError, actionSuccess } from '@/core/actions/utils';
import { db } from '@/core/database/relational/config';
import { userTable } from '@/core/database/relational/tables';
import {
  createSession,
  deleteSessionTokenCookie,
  generateSessionToken,
  invalidateSession,
  setSessionTokenCookie,
  validateSessionToken,
} from './manager';
import { signInSchema } from './schemas/signin';
import { SignUpSchema, signUpSchema } from './schemas/signup';
import type {
  Session,
  SessionValidationResult,
  SignInError,
  SignUpError,
  User,
  UserDTO,
} from './types';

export async function signUpUser(
  data: object,
): Promise<
  ActionResult<User, typeToFlattenedError<SignUpSchema> | SignUpError | string>
> {
  const validation = signUpSchema.safeParse(data);

  if (!validation.success) {
    return actionError(validation.error.flatten());
  }

  const userData = validation.data;

  userData.password = await argon2.hash(userData.password);

  try {
    const [newUser] = await db.insert(userTable).values(userData).returning();

    if (!newUser) {
      return actionError('failedCreateUser');
    }

    const token = generateSessionToken();

    await createSession(token, newUser.id);
    await setSessionTokenCookie(
      token,
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    );

    return actionSuccess(newUser);
  } catch (e) {
    console.error(e);
    let message = 'unknownSu';
    if (e instanceof NeonDbError) {
      if (e.constraint === 'user_nickname_unique') {
        message = 'nicknameAlreadyExists';
      }
    } else if (e instanceof Error) {
      message = e.message;
    }
    return actionError(message);
  }
}

export async function signInUser(
  data: object,
): Promise<
  ActionResult<
    { user: UserDTO; session: Session },
    typeToFlattenedError<SignUpSchema> | SignInError | string
  >
> {
  const validation = signInSchema.safeParse(data);

  if (!validation.success) {
    return actionError(validation.error.flatten());
  }

  const userData = validation.data;

  try {
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.nickname, userData.nickname))
      .limit(1);

    if (!user) {
      return actionError('invalidUserPassword');
    }

    const isValidPassword = await argon2.verify(
      user.password,
      userData.password,
    );

    if (!isValidPassword) {
      return actionError('invalidUserPassword');
    }

    const token = generateSessionToken();

    const session = await createSession(token, user.id);
    await setSessionTokenCookie(
      token,
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    );

    return actionSuccess({
      user: {
        nickname: user.nickname,
        id: user.id,
        admin: user.admin,
        googleId: user.googleId,
        country: user.country,
      },
      session,
    });
  } catch (e) {
    console.error(e);
    let message = 'unknownSi';
    if (e instanceof Error) {
      message = e.message;
    }
    return actionError(message);
  }
}

export async function signOutUser(): Promise<ActionResult<undefined>> {
  try {
    const { session } = await auth();

    if (!session) {
      return actionError('noSession');
    }

    await invalidateSession(session.id);
    await deleteSessionTokenCookie();
    return actionSuccess(undefined);
  } catch (e) {
    console.error(e);
    let message = 'unknown';
    if (e instanceof Error) {
      message = e.message;
    }
    return actionError(message);
  }
}

export const auth = cache(async (): Promise<SessionValidationResult> => {
  const cookieStore = await cookies();

  const sessionId = cookieStore.get('sessionToken')?.value;

  if (!sessionId) {
    return {
      user: null,
      session: null,
    };
  }

  const result = await validateSessionToken(sessionId);
  return result;
});
