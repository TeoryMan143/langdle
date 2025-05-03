'use server';

import { actionError, ActionResult, actionSuccess } from '@/core/actions/utils';
import { SignUpSchema, signUpSchema } from './schemas/signup';
import { type typeToFlattenedError } from 'zod';
import type { Session, User } from './types';
import { db } from '@/core/database/relational/config';
import { userTable } from '@/core/database/relational/tables';
import argon2 from 'argon2';
import { NeonDbError } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
} from './manager';
import { signInSchema } from './schemas/signin';

export async function signUpUser(
  data: object,
): Promise<ActionResult<User, typeToFlattenedError<SignUpSchema> | string>> {
  const validation = signUpSchema.safeParse(data);

  if (!validation.success) {
    return actionError(validation.error.flatten());
  }

  const userData = validation.data;

  userData.password = await argon2.hash(userData.password);

  try {
    const [newUser] = await db.insert(userTable).values(userData).returning();

    if (!newUser) {
      return actionError('Failed to create user');
    }

    return actionSuccess(newUser);
  } catch (e) {
    console.error(e);
    let message = 'unknown';
    if (e instanceof NeonDbError) {
      if (e.constraint === 'user_nickname_unique') {
        message = 'Nickname already exists';
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
    { user: User; session: Session },
    typeToFlattenedError<SignUpSchema> | string
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
      return actionError('User not found');
    }

    const isValidPassword = await argon2.verify(
      user.password,
      userData.password,
    );

    if (!isValidPassword) {
      return actionError('Invalid password');
    }

    const token = generateSessionToken();

    const session = await createSession(token, user.id);
    await setSessionTokenCookie(
      session.id,
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    );

    return actionSuccess({ user, session });
  } catch (e) {
    console.error(e);
    let message = 'unknown';
    if (e instanceof Error) {
      message = e.message;
    }
    return actionError(message);
  }
}
