'use server';

import { cache } from 'react';
import type { typeToFlattenedError } from 'zod';
import { actionError, actionSuccess } from '@/core/lib/action';
import { apiRequest } from '@/core/lib/api-client';
import {
  clearSessionCookie,
  getSessionToken,
  setSessionCookie,
} from '@/core/lib/session';
import type { ActionResult } from '@/core/types';
import { validateSessionToken } from './service';
import type {
  AuthPayload,
  GoogleSignUpSchema,
  OAuthSignupData,
  SessionValidationResult,
  SignInSchema,
  SignUpSchema,
  UserDTO,
} from './types';

type AuthActionResult<S> = ActionResult<
  UserDTO,
  typeToFlattenedError<S> | string
>;

/**
 * Opens the session returned by the API in the browser. Setting the cookie is
 * the only part of the flow that cannot live in the controller.
 */
async function startSession(payload: AuthPayload) {
  await setSessionCookie(payload.token, new Date(payload.expiresAt));
  return actionSuccess(payload.user);
}

export async function signUpUser(
  data: unknown,
): Promise<AuthActionResult<SignUpSchema>> {
  const res = await apiRequest<AuthPayload, typeToFlattenedError<SignUpSchema>>(
    '/auth/signup',
    { method: 'post', body: data },
  );

  if (!res.success) {
    return actionError(res.error.errors ?? res.error.key);
  }

  return startSession(res.result);
}

export async function signInUser(
  data: unknown,
): Promise<AuthActionResult<SignInSchema>> {
  const res = await apiRequest<AuthPayload, typeToFlattenedError<SignInSchema>>(
    '/auth/signin',
    { method: 'post', body: data },
  );

  if (!res.success) {
    return actionError(res.error.errors ?? res.error.key);
  }

  return startSession(res.result);
}

export async function getOAuthSignupData(
  token: string,
): Promise<ActionResult<OAuthSignupData>> {
  const res = await apiRequest<OAuthSignupData>('/auth/oauth/signup-data', {
    searchParams: { token },
  });

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

export async function createGoogleAccount(
  data: GoogleSignUpSchema,
): Promise<AuthActionResult<GoogleSignUpSchema>> {
  const res = await apiRequest<
    AuthPayload,
    typeToFlattenedError<GoogleSignUpSchema>
  >('/auth/oauth/signup', { method: 'post', body: data });

  if (!res.success) {
    return actionError(res.error.errors ?? res.error.key);
  }

  return startSession(res.result);
}

export async function signOutUser(): Promise<ActionResult<undefined>> {
  const res = await apiRequest<{ success: boolean }>('/auth/signout', {
    method: 'post',
    auth: true,
  });

  if (!res.success) {
    return actionError(
      res.error.key === 'notSignedIn' ? 'noSession' : res.error.key,
    );
  }

  await clearSessionCookie();

  return actionSuccess(undefined);
}

export async function deleteAccount(): Promise<ActionResult<undefined>> {
  const res = await apiRequest<{ success: boolean }>('/auth/me', {
    method: 'delete',
    auth: true,
  });

  if (!res.success) {
    return actionError(res.error.key);
  }

  await clearSessionCookie();

  return actionSuccess(undefined);
}

/**
 * Session of the current request. Server components and other actions use it
 * instead of calling the API, so it stays a single cached database read.
 */
export const auth = cache(async (): Promise<SessionValidationResult> => {
  const sessionToken = await getSessionToken();

  if (!sessionToken) {
    return { user: null, session: null };
  }

  return validateSessionToken(sessionToken);
});
