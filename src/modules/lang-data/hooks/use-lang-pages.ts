import { useInfiniteQuery } from '@tanstack/react-query';
import { getLanguagesPage } from '../actions';
import type { LanguagePage, LanguagePageParams } from '../types';

type Options = Omit<LanguagePageParams, 'cursor'> & {
  /**
   * The first batch, already read by the server component, so the list paints
   * without a round trip. It is the batch *without* a `query`: a search starts
   * from the network.
   */
  initialPage?: LanguagePage;
};

/**
 * The catalogue batch by batch (`GET /lang/page`): `data.pages` holds what was
 * loaded so far, `fetchNextPage` asks for the batch after the last one.
 */
export function useLangPages({
  limit,
  onlyActives,
  query,
  initialPage,
}: Options = {}) {
  const normalizedQuery = query?.trim() || undefined;

  return useInfiniteQuery({
    queryKey: [
      'langs',
      'pages',
      { limit, onlyActives, query: normalizedQuery },
    ],
    queryFn: async ({ pageParam }) => {
      const { success, error, result } = await getLanguagesPage({
        limit,
        onlyActives,
        query: normalizedQuery,
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
      initialPage && !normalizedQuery
        ? { pages: [initialPage], pageParams: [null] }
        : undefined,
    // Keep the batches on screen while the next search loads.
    placeholderData: previous => previous,
    // Refetching an infinite query reloads every batch it holds, one by one:
    // not worth it on each focus for a catalogue that rarely changes.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
