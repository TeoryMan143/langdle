import {
  type ActionResult,
  actionError,
  actionSuccess,
} from '@/core/actions/utils';
import { Language, LanguageMatching } from '@/core/lib/types';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export async function checkGuess(
  langId: string,
): Promise<ActionResult<{ guessed: Language } | LanguageMatching>> {
  try {
    const res = await fetch(`${baseUrl}/api/daily/${langId}`);

    if (!res.ok) {
      const error = await res.json();
      return actionError(error.key);
    }

    const matching = await res.json();

    return actionSuccess(matching);
  } catch (e) {
    console.error(e);
    let message = 'unknown';
    if (e instanceof Error) {
      message = e.message;
    }
    return actionError(message);
  }
}
