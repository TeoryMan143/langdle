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

/** The cache key of one listing: what `setQueryData` needs to edit it. */
export function langPagesKey({
  limit,
  active,
  sort,
  query,
}: Omit<LanguagePageParams, 'cursor'>) {
  return [
    'langs',
    'pages',
    { limit, active, sort, query: query?.trim() || undefined },
  ] as const;
}

/**
 * The catalogue batch by batch (`GET /lang/page`): `data.pages` holds what was
 * loaded so far, `fetchNextPage` asks for the batch after the last one.
 */
export function useLangPages({
  limit,
  active,
  sort,
  query,
  initialPage,
}: Options = {}) {
  const queryKey = langPagesKey({ limit, active, sort, query });
  const normalizedQuery = queryKey[2].query;

  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const { success, error, result } = await getLanguagesPage({
        limit,
        active,
        sort,
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
