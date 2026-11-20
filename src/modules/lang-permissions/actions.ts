'use server';

import { actionError, actionSuccess } from '@/core/lib/action';
import { apiRequest } from '@/core/lib/api-client';
import type { ActionResult } from '@/core/types';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export async function getLangPermissions(
  userId: string,
): Promise<ActionResult<string[]>> {
  const res = await apiRequest<string[]>(`/lang/permissions/${userId}`);

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

export async function getLangPermissionUrl(
  langCode: string,
): Promise<ActionResult<string>> {
  const res = await apiRequest<{ token: string }>(
    `/lang/permissions/tokens/${langCode}`,
    { method: 'post', auth: true },
  );

  if (!res.success) {
    return actionError(res.error.key);
  }

  return actionSuccess(`${baseUrl}/addpermission?token=${res.result.token}`);
}

export async function setLangPermission(
  token: string,
): Promise<ActionResult<string>> {
  const res = await apiRequest<{ lang: string }>(
    `/lang/permissions/claim/${token}`,
    { method: 'put', auth: true },
  );

  return res.success
    ? actionSuccess(res.result.lang)
    : actionError(res.error.key);
}
