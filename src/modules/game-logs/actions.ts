'use server';

import { actionError, actionSuccess } from '@/core/lib/action';
import { apiRequest } from '@/core/lib/api-client';
import type { ActionResult } from '@/core/types';
import type { GameLogPage, GameLogPageParams, GameLogReq } from './types';

/**
 * Logs a game event as the browser's: signed when there is a session, with
 * the browser's headers forwarded so the API records its IP, not the server's.
 */
export async function logGameEvent(
  log: GameLogReq,
): Promise<ActionResult<{ id: string }>> {
  const res = await apiRequest<{ id: string }>('/logs/game', {
    method: 'post',
    auth: 'optional',
    forwardClient: true,
    body: log,
  });

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}

/** One batch of a day's events, newest first (administrators only). */
export async function getGameLogs({
  date,
  limit,
  cursor,
}: GameLogPageParams = {}): Promise<ActionResult<GameLogPage>> {
  const res = await apiRequest<GameLogPage>('/logs/game', {
    auth: true,
    searchParams: {
      ...(date ? { date } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(cursor ? { cursor } : {}),
    },
    // Events arrive every second: never a cached batch.
    cache: 'no-store',
  });

  return res.success ? actionSuccess(res.result) : actionError(res.error.key);
}
