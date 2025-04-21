'use server';

import { actionError, ActionResult, actionSuccess } from '@/core/actions/utils';
import { Language } from '@/core/lib/types';
import { LANG_API_URL } from '@/core/lib/utils';

export async function getAllLanguages(): Promise<ActionResult<Language[]>> {
  try {
    const langs = (await fetch(`${LANG_API_URL}/api/lang`).then(r =>
      r.json(),
    )) as Language[];
    return actionSuccess(langs);
  } catch (e) {
    let message = 'unknown error';
    if (e instanceof Error) {
      message = e.message;
    }
    return actionError(message);
  }
}
