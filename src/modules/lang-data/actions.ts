'use server';

import { revalidatePath } from 'next/cache';
import { getLocale, getTranslations } from 'next-intl/server';
import { actionError, actionSuccess } from '@/core/lib/action';
import { apiRequest } from '@/core/lib/api-client';
import type { ActionResult, Language, LanguageDataBody } from '@/core/types';
import type {
  AdminChangeRequestDTO,
  AdminLanguageRequestDTO,
  ChangeRequestDTO,
  ChangeRequestFormValues,
  LanguageName,
  LanguagePage,
  LanguagePageParams,
  LanguageRequestDTO,
  LanguagesSummary,
} from './types';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

/* -------------------------------------------------------------------------- */
/*                                  Languages                                 */
/* -------------------------------------------------------------------------- */

export async function getAllLanguages(): Promise<ActionResult<Language[]>> {
  const res = await apiRequest<Language[]>('/lang');

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

/**
 * Only the languages playable today, with the localized exonym added to the
 * search params so the selector can match what the user actually reads.
 */
export async function getAllActiveLanguages(): Promise<
  ActionResult<Language[]>
> {
  const res = await apiRequest<Language[]>('/lang', {
    searchParams: { oactive: '1' },
  });

  if (!res.success) {
    return actionError(res.error.key);
  }

  const t = await getTranslations('Exonyms');

  return actionSuccess(
    res.result.map(lang => ({
      ...lang,
      // Languages added through requests have no translated exonym yet.
      searchParams: t.has(lang.id)
        ? [...lang.searchParams, t(lang.id)]
        : lang.searchParams,
    })),
  );
}

/**
 * The names a picker searches, with the exonym translated in the current
 * locale added to each language's search params: the game shows that name, so
 * the user types it.
 */
export async function getLanguageNames({
  active,
}: {
  active?: boolean;
} = {}): Promise<ActionResult<LanguageName[]>> {
  const res = await apiRequest<LanguageName[]>('/lang/names', {
    searchParams: active === undefined ? {} : { active },
    cache: 'no-store',
  });

  if (!res.success) {
    return actionError(res.error.key);
  }

  const t = await getTranslations('Exonyms');

  return actionSuccess(
    res.result.map(lang => ({
      ...lang,
      // Languages added through requests have no translated exonym yet.
      searchParams: t.has(lang.id)
        ? [...lang.searchParams, t(lang.id)]
        : lang.searchParams,
    })),
  );
}

/**
 * One batch of the catalogue; pass the previous batch's `nextCursor` to get
 * the next one.
 */
export async function getLanguagesPage({
  limit,
  cursor,
  active,
  sort,
  query,
}: LanguagePageParams = {}): Promise<ActionResult<LanguagePage>> {
  const res = await apiRequest<LanguagePage>('/lang/page', {
    searchParams: {
      ...(limit !== undefined ? { limit } : {}),
      ...(cursor ? { cursor } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(sort ? { sort } : {}),
      ...(query ? { q: query } : {}),
    },
    // A language edited or activated must show up on the next batch.
    cache: 'no-store',
  });

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

export async function getLanguagesSummary(): Promise<
  ActionResult<LanguagesSummary>
> {
  const res = await apiRequest<LanguagesSummary>('/lang/summary', {
    cache: 'no-store',
  });

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

export async function getLanguagesByIds(
  ids: string[],
): Promise<ActionResult<Language[]>> {
  const res = await apiRequest<Language[]>('/lang', {
    searchParams: { id: ids },
  });

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

export async function getLanguage(
  code: string,
): Promise<ActionResult<Language>> {
  const res = await apiRequest<Language>(`/lang/${code}`);

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

export async function getRandomLanguage(): Promise<ActionResult<Language>> {
  const res = await apiRequest<Language>('/lang/random', {
    cache: 'no-store',
  });

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

export async function setLanguageData(
  code: string,
  data: LanguageDataBody,
): Promise<ActionResult<string>> {
  const res = await apiRequest(`/lang/${code}`, {
    method: 'put',
    body: data,
    auth: true,
  });

  if (!res.success) {
    return actionError(res.error.key);
  }

  revalidatePath(`/data/${code}`);

  return actionSuccess('Language data updated successfully');
}

export async function setLangStatus(
  langId: string,
  status: boolean,
): Promise<ActionResult<string>> {
  const res = await apiRequest<{ lang: string }>(`/lang/${langId}/status`, {
    method: 'put',
    auth: true,
    searchParams: { active: status },
  });

  if (!res.success) {
    return actionError(res.error.key);
  }

  revalidatePath(`/data/${langId}`);

  return actionSuccess(res.result.lang);
}

/* -------------------------------------------------------------------------- */
/*                             Editing permissions                            */
/* -------------------------------------------------------------------------- */

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
