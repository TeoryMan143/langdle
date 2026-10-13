'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess } from '@/core/lib/action';
import { apiRequest } from '@/core/lib/api-client';
import type { ActionResult } from '@/core/types';
import type { UserDTO } from '@/modules/auth/types';
import type { PublicProfile } from './types';

export async function editNativeLanguage(
  langId: string,
): Promise<ActionResult<UserDTO>> {
  const res = await apiRequest<{ updated: UserDTO }>('/user/native-lang', {
    method: 'put',
    auth: true,
    body: { nativeLang: langId },
  });

  if (!res.success) {
    return actionError(res.error.key);
  }

  revalidatePath('/account');

  return actionSuccess(res.result.updated);
}

export async function editFluentLanguages(
  langIds: string[],
): Promise<ActionResult<UserDTO>> {
  const res = await apiRequest<{ updated: UserDTO }>('/user/fluent', {
    method: 'put',
    auth: true,
    body: { fluent: langIds },
  });

  if (!res.success) {
    return actionError(res.error.key);
  }

  revalidatePath('/account');

  return actionSuccess(res.result.updated);
}

export async function getUserProfile(
  userId: string,
): Promise<ActionResult<PublicProfile>> {
  const res = await apiRequest<PublicProfile>(`/user/${userId}`);

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}
