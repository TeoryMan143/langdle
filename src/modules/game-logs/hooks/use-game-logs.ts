import {
  type InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { getGameLogs } from '../actions';
import type { GameLogPage } from '../types';

type Options = {
  /** The UTC day, `yyyy-mm-dd`. */
  date: string;
  limit: number;
  /** The first batch of `initialDate`, already read by the server. */
  initialPage?: GameLogPage;
  initialDate?: string;
};

export const gameLogsKey = (date: string, limit: number) =>
  ['game-logs', { date, limit }] as const;

/**
 * One day of game events batch by batch (`GET /logs/game`), newest first.
 * `refresh` reloads the newest batch alone: refetching every loaded batch
 * from its old cursor would leave a gap under the new events.
 */
export function useGameLogs({
  date,
  limit,
  initialPage,
  initialDate,
}: Options) {
  const queryClient = useQueryClient();
  const queryKey = gameLogsKey(date, limit);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const { success, error, result } = await getGameLogs({
        date,
        limit,
        cursor: pageParam ?? undefined,
      });

      if (!success) {
        throw new Error(error);
      }

      return result;
    },
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor,
    initialData:
      initialPage && date === initialDate
        ? { pages: [initialPage], pageParams: [null] }
        : undefined,
    placeholderData: previous => previous,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { refetch } = query;

  const refresh = useCallback(() => {
    queryClient.setQueryData<InfiniteData<GameLogPage, string | null>>(
      gameLogsKey(date, limit),
      current =>
        current && {
          pages: current.pages.slice(0, 1),
          pageParams: current.pageParams.slice(0, 1),
        },
    );
    return refetch();
  }, [date, limit, queryClient, refetch]);

  return { ...query, refresh };
}
