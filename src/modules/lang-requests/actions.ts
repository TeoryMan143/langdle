'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { actionError, actionSuccess } from '@/core/lib/action';
import { apiRequest } from '@/core/lib/api-client';
import type { ActionResult } from '@/core/types';
import type {
  AdminChangeRequestDTO,
  AdminLanguageRequestDTO,
  ChangeRequestDTO,
  ChangeRequestFormValues,
  LanguageRequestDTO,
} from './types';

/* -------------------------------------------------------------------------- */
/*                               Change requests                              */
/* -------------------------------------------------------------------------- */

export async function uploadChangeRequest(
  change: ChangeRequestFormValues,
): Promise<ActionResult<{ result: boolean }>> {
  const res = await apiRequest<{ result: boolean }>('/lang/change-requests', {
    method: 'post',
    auth: true,
    body: { ...change, locale: await getLocale() },
  });

  if (!res.success) {
    return actionError(res.error.key);
  }

  revalidatePath('/account');

  return actionSuccess(res.result);
}

export async function getMyChangeRequests(): Promise<
  ActionResult<ChangeRequestDTO[]>
> {
  const res = await apiRequest<ChangeRequestDTO[]>(
    '/lang/change-requests/mine',
    {
      auth: true,
      cache: 'no-store',
    },
  );

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

export async function getChangeRequests(): Promise<
  ActionResult<AdminChangeRequestDTO[]>
> {
  const res = await apiRequest<AdminChangeRequestDTO[]>(
    '/lang/change-requests',
    {
      auth: true,
      cache: 'no-store',
    },
  );

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

type ReviewPayload = { request: ChangeRequestDTO; emailSent: boolean };

export async function acceptChangeRequest(
  id: string,
): Promise<ActionResult<ReviewPayload>> {
  const res = await apiRequest<ReviewPayload>(
    `/lang/change-requests/${id}/accept`,
    { method: 'put', auth: true },
  );

  if (!res.success) {
    return actionError(res.error.key);
  }

  revalidatePath('/data/requests');
  revalidatePath('/account');
  revalidatePath(`/data/${res.result.request.lang}`);
  revalidatePath('/data/public');

  return actionSuccess(res.result);
}

export async function rejectChangeRequest(
  id: string,
  reason: string,
): Promise<ActionResult<ReviewPayload>> {
  const res = await apiRequest<ReviewPayload>(
    `/lang/change-requests/${id}/reject`,
    { method: 'put', auth: true, body: { reason } },
  );

  if (!res.success) {
    return actionError(res.error.key);
  }

  revalidatePath('/data/requests');
  revalidatePath('/account');

  return actionSuccess(res.result);
}

/* -------------------------------------------------------------------------- */
/*                              Language requests                             */
/* -------------------------------------------------------------------------- */

/**
 * Sends a language request. The form gives the multipart body the API wants
 * (`data` as JSON plus the `flag` file); the locale is added to `data` here.
 */
export async function uploadLanguageRequest(
  formData: FormData,
): Promise<ActionResult<LanguageRequestDTO>> {
  const raw = formData.get('data');
  const flag = formData.get('flag');

  if (typeof raw !== 'string' || !(flag instanceof File)) {
    return actionError('invalidData');
  }

  let data: Record<string, unknown>;

  try {
    data = JSON.parse(raw);
  } catch (_) {
    return actionError('invalidData');
  }

  const body = new FormData();
  body.set('data', JSON.stringify({ ...data, locale: await getLocale() }));
  body.set('flag', flag);

  const res = await apiRequest<LanguageRequestDTO>('/lang/language-requests', {
    method: 'post',
    auth: true,
    body,
  });

  if (!res.success) {
    return actionError(res.error.key);
  }

  revalidatePath('/account');

  return actionSuccess(res.result);
}

export async function getMyLanguageRequests(): Promise<
  ActionResult<LanguageRequestDTO[]>
> {
  const res = await apiRequest<LanguageRequestDTO[]>(
    '/lang/language-requests/mine',
    { auth: true, cache: 'no-store' },
  );

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

export async function getLanguageRequests(): Promise<
  ActionResult<AdminLanguageRequestDTO[]>
> {
  const res = await apiRequest<AdminLanguageRequestDTO[]>(
    '/lang/language-requests',
    { auth: true, cache: 'no-store' },
  );

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

type LanguageReviewPayload = {
  request: LanguageRequestDTO;
  emailSent: boolean;
};

export async function acceptLanguageRequest(
  id: string,
): Promise<ActionResult<LanguageReviewPayload>> {
  const res = await apiRequest<LanguageReviewPayload>(
    `/lang/language-requests/${id}/accept`,
    { method: 'put', auth: true },
  );

  if (!res.success) {
    return actionError(res.error.key);
  }

  revalidatePath('/data/requests');
  revalidatePath('/data');
  revalidatePath('/data/public');
  revalidatePath('/account');

  return actionSuccess(res.result);
}

export async function rejectLanguageRequest(
  id: string,
  reason: string,
): Promise<ActionResult<LanguageReviewPayload>> {
  const res = await apiRequest<LanguageReviewPayload>(
    `/lang/language-requests/${id}/reject`,
    { method: 'put', auth: true, body: { reason } },
  );

  if (!res.success) {
    return actionError(res.error.key);
  }

  revalidatePath('/data/requests');
  revalidatePath('/account');

  return actionSuccess(res.result);
}
