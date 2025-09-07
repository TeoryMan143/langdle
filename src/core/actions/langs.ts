'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { ActionResult, actionError, actionSuccess } from '@/core/actions/utils';
import type { Language, LanguageData } from '@/core/lib/types';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export async function getAllLanguages(): Promise<ActionResult<Language[]>> {
  try {
    const res = await fetch(`${baseUrl}/api/lang`);

    if (!res.ok) {
      const error = await res.json();
      console.error(error);
      return actionError(error.key);
    }

    const langs = (await res.json()) as Language[];

    return actionSuccess(langs);
  } catch (e) {
    let message = 'unknown error';
    if (e instanceof Error) {
      console.error(e);
      message = e.message;
    }
    return actionError(message);
  }
}

export async function getAllActiveLanguages(): Promise<
  ActionResult<Language[]>
> {
  try {
    const res = await fetch(`${baseUrl}/api/lang?oactive=1`);

    if (!res.ok) {
      const error = await res.json();
      console.error(error);
      return actionError(error.key);
    }

    const langs = (await res.json()) as Language[];

    const t = await getTranslations('Exonyms');

    return actionSuccess(
      langs.map(l => ({ ...l, searchParams: [...l.searchParams, t(l.id)] })),
    );
  } catch (e) {
    let message = 'unknown error';
    if (e instanceof Error) {
      console.error(e);
      message = e.message;
    }
    return actionError(message);
  }
}

export async function getLanguagesByIds(
  ids: string[],
): Promise<ActionResult<Language[]>> {
  try {
    const searchIds = ids.map(id => `id=${id}`).join('&');

    const res = await fetch(`${baseUrl}/api/lang/?${searchIds}`);

    if (!res.ok) {
      const error = await res.json();
      console.error(error);
      return actionError(error.key);
    }

    const langs = (await res.json()) as Language[];

    return actionSuccess(langs);
  } catch (e) {
    let message = 'unknown error';
    if (e instanceof Error) {
      console.error(e);
      message = e.message;
    }
    return actionError(message);
  }
}

export async function getLanguage(
  code: string,
): Promise<ActionResult<Language>> {
  try {
    const res = await fetch(`${baseUrl}/api/lang/${code}`);

    if (!res.ok) {
      const error = await res.json();
      console.error(error);
      return actionError(error.key);
    }

    const lang = (await res.json()) as Language;

    return actionSuccess(lang);
  } catch (e) {
    let message = 'unknown error';
    if (e instanceof Error) {
      console.error(e);
      message = e.message;
    }
    return actionError(message);
  }
}

export async function getRandomLanguage(): Promise<ActionResult<Language>> {
  try {
    const res = await fetch(`${baseUrl}/api/lang/random`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      const error = await res.json();
      console.error(error);
      return actionError(error.key);
    }

    const lang = (await res.json()) as Language;

    return actionSuccess(lang);
  } catch (e) {
    let message = 'unknown error';
    if (e instanceof Error) {
      console.error(e);
      message = e.message;
    }
    return actionError(message);
  }
}

export async function setLanguageData(
  code: string,
  data: LanguageData,
): Promise<ActionResult<string>> {
  try {
    const cookieStore = await cookies();

    const sessionId = cookieStore.get('sessionToken')?.value;

    if (!sessionId) {
      return actionError('noSession');
    }

    const res = await fetch(`${baseUrl}/api/lang/${code}`, {
      method: 'put',
      body: JSON.stringify(data),
      cache: 'no-cache',
      headers: {
        Authorization: `Bearer ${sessionId}`,
      },
    });

    if (!res.ok) {
      const error = await res.json();
      console.error(error);
      return actionError(error.key);
    }

    const locale = await getLocale();

    revalidatePath(`/${locale}/data/${code}`);

    return actionSuccess('Language data updated successfully');
  } catch (e) {
    let message = 'unknown';
    if (e instanceof Error) {
      console.error(e);
      message = e.message;
    }
    return actionError(message);
  }
}
