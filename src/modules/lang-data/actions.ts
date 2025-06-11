'use server';

import { actionError, ActionResult, actionSuccess } from '@/core/actions/utils';

export async function getLangPermissions(
  userId: string,
): Promise<ActionResult<string[]>> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/lang/permissions/${userId}`,
    );

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
