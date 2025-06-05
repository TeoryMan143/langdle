'use server';

import { actionError, ActionResult, actionSuccess } from '@/core/actions/utils';
import type { Language, LanguageData } from '@/core/lib/types';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export async function getAllLanguages(): Promise<ActionResult<Language[]>> {
  try {
    const res = await fetch(`${baseUrl}/api/lang`);

    if (res.status !== 200) {
      const error = await res.json();
      console.error(error);
      return actionError(error.message);
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

export async function getLanguagesByIds(
  ids: string[],
): Promise<ActionResult<Language[]>> {
  try {
    const searchIds = ids.map(id => `id=${id}`).join('&');

    const res = await fetch(`${baseUrl}/api/lang/?${searchIds}`);

    if (res.status !== 200) {
      const error = await res.json();
      console.error(error);
      return actionError(error.message);
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

    if (res.status !== 200) {
      const error = await res.json();
      console.error(error);
      return actionError(error.message);
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
      return actionError('Must be signed in');
    }

    const res = await fetch(`${baseUrl}/api/lang/${code}`, {
      method: 'put',
      body: JSON.stringify(data),
      cache: 'no-cache',
      headers: {
        Cookie: `sessionToken=${sessionId}`,
      },
    });

    if (res.status !== 200) {
      const error = await res.json();
      console.error(error);
      return actionError(error.message);
    }

    revalidatePath(`/data/${code}`);

    const lang = (await res.json()).message;

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
