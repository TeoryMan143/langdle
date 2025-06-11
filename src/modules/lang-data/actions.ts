'use server';

import { actionError, ActionResult, actionSuccess } from '@/core/actions/utils';
import { cookies } from 'next/headers';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export async function getLangPermissions(
  userId: string,
): Promise<ActionResult<string[]>> {
  try {
    const res = await fetch(`${baseUrl}/api/lang/permissions/${userId}`);

    const body = await res.json();

    if (!res.ok) {
      return actionError(body.message);
    }

    return actionSuccess(body);
  } catch (e) {
    console.error(e);
    let message = 'unknown';
    if (e instanceof Error) {
      message = e.message;
    }
    return actionError(message);
  }
}

export async function getLangPermissionUrl(
  langCode: string,
): Promise<ActionResult<string>> {
  try {
    const cookieStore = await cookies();

    const sessionId = cookieStore.get('sessionToken')?.value;

    if (!sessionId) {
      return actionError('Must be signed in');
    }

    const res = await fetch(
      `${baseUrl}/api/lang/permissions/generatetoken/${langCode}`,
      {
        cache: 'no-cache',
        headers: {
          Cookie: `sessionToken=${sessionId}`,
        },
      },
    );

    const body = await res.json();

    if (!res.ok) {
      return actionError(body.message);
    }

    return actionSuccess(
      `${baseUrl}/addpermission?token=${body.token as string}`,
    );
  } catch (e) {
    console.error(e);
    let message = 'unknown';
    if (e instanceof Error) {
      message = e.message;
    }
    return actionError(message);
  }
}

export async function setLangPermission(
  token: string,
): Promise<ActionResult<string>> {
  try {
    const cookieStore = await cookies();

    const sessionId = cookieStore.get('sessionToken')?.value;

    if (!sessionId) {
      return actionError('Must be signed in');
    }

    const res = await fetch(`${baseUrl}/api/lang/permissions/set/${token}`, {
      method: 'put',
      cache: 'no-cache',
      headers: {
        Cookie: `sessionToken=${sessionId}`,
      },
    });

    const body = await res.json();

    if (!res.ok) {
      return actionError(body.message);
    }

    return actionSuccess(body.lang);
  } catch (e) {
    console.error(e);
    let message = 'unknown';
    if (e instanceof Error) {
      message = e.message;
    }
    return actionError(message);
  }
}
