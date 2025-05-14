'use server';

import { actionError, ActionResult, actionSuccess } from '@/core/actions/utils';

export async function getLangPermissions(
  userId: string,
): Promise<ActionResult<string[]>> {
  try {
    const permissions = (await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/lang/permissions/${userId}`,
    ).then(res => res.json())) as string[];
    return actionSuccess(permissions);
  } catch (e) {
    console.error(e);
    let message = 'unknown';
    if (e instanceof Error) {
      message = e.message;
    }
    return actionError(message);
  }
}
