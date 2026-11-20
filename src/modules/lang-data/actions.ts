'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { actionError, actionSuccess } from '@/core/lib/action';
import { apiRequest } from '@/core/lib/api-client';
import type { ActionResult, Language, LanguageDataBody } from '@/core/types';
import type {
  LanguageName,
  LanguagePage,
  LanguagePageParams,
  LanguagesSummary,
} from './types';

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
