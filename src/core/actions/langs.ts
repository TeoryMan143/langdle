'use server';

import { actionError, ActionResult, actionSuccess } from '@/core/actions/utils';
import type { Language, LanguageCode, LanguageData } from '@/core/lib/types';
import { LANG_API_URL } from '@/core/lib/utils';
import { revalidatePath } from 'next/cache';

export async function getAllLanguages(): Promise<ActionResult<Language[]>> {
  try {
    const res = await fetch(`${LANG_API_URL}/api/lang`);

    if (res.status !== 200) {
      const error = await res.json();
      return actionError(error.message);
    }

    const langs = (await res.json()) as Language[];

    return actionSuccess(langs);
  } catch (e) {
    let message = 'unknown error';
    if (e instanceof Error) {
      message = e.message;
    }
    return actionError(message);
  }
}

export async function getLanguage(
  code: LanguageCode,
): Promise<ActionResult<Language>> {
  try {
    const res = await fetch(`${LANG_API_URL}/api/lang/${code}`);

    if (res.status !== 200) {
      const error = await res.json();
      return actionError(error.message);
    }

    const lang = (await res.json()) as Language;

    return actionSuccess(lang);
  } catch (e) {
    let message = 'unknown error';
    if (e instanceof Error) {
      message = e.message;
    }
    return actionError(message);
  }
}

export async function setLanguageData(
  code: LanguageCode,
  data: LanguageData,
): Promise<ActionResult<string>> {
  try {
    const res = await fetch(`${LANG_API_URL}/api/lang/${code}`, {
      method: 'put',
      body: JSON.stringify(data),
    });

    if (res.status !== 200) {
      const error = await res.json();
      return actionError(error.message);
    }

    revalidatePath(`/data/${code}`);

    const lang = (await res.json()).message;

    return actionSuccess(lang);
  } catch (e) {
    let message = 'unknown error';
    if (e instanceof Error) {
      message = e.message;
    }
    return actionError(message);
  }
}
