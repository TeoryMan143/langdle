import {
  type ActionResult,
  actionError,
  actionSuccess,
} from '@/core/actions/utils';
import { Language, LanguageMatching } from '@/core/lib/types';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export async function checkGuess(
  guessId: string,
  targetId: string,
): Promise<ActionResult<{ guessed: Language } | LanguageMatching>> {
  try {
    const res = await fetch(
      `${baseUrl}/api/guess/${guessId}?target=${targetId}`,
    );

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

export async function getDailyLanguage(): Promise<ActionResult<Language>> {
  try {
    const res = await fetch(`${baseUrl}/api/guess/daily`);

    if (!res.ok) {
      const error = await res.json();
      return actionError(error.key);
    }

    const correct = await res.json();

    return actionSuccess(correct);
  } catch (e) {
    console.error(e);
    let message = 'unknown';
    if (e instanceof Error) {
      message = e.message;
    }
    return actionError(message);
  }
}
