'use server';

import { actionError, actionSuccess } from '@/core/lib/action';
import { apiRequest } from '@/core/lib/api-client';
import type { ActionResult, Language } from '@/core/types';
import type { GameHistory, GuessHistoryReq, GuessResult } from './types';

export async function checkGuess(
  guessId: string,
  targetId: string,
): Promise<ActionResult<GuessResult>> {
  const res = await apiRequest<GuessResult>(`/guess/${guessId}`, {
    searchParams: { target: targetId },
  });

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

export async function getDailyLanguage(): Promise<ActionResult<Language>> {
  const res = await apiRequest<Language>('/guess/daily');

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

export async function addGameHistory(
  historyData: GuessHistoryReq,
): Promise<ActionResult<GameHistory>> {
  const res = await apiRequest<GameHistory>('/guess/history', {
    method: 'put',
    auth: true,
    body: historyData,
  });

  // No revalidatePath: /account is dynamic and reads the history fresh, and
  // revalidating would re-render the page that called this, where /random
  // picks a new language mid-game.
  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

export async function getGameHistory(): Promise<
  ActionResult<GameHistory[], string>
> {
  const res = await apiRequest<GameHistory[]>('/guess/history', {
    auth: true,
    cache: 'no-store',
  });

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}
