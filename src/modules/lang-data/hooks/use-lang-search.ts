import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { rankByQuery, searchTerms } from '@/core/lib/search';
import { getLanguageNames } from '../actions';
import type { LangSearchResult } from '../types';

type Options = {
  query: string;
  /**
   * Only the playable languages (`true`, the default), the unplayable ones
   * (`false`) or every language (`'all'`, for the profile's pickers).
   */
  active?: boolean | 'all';
};

/**
 * The languages a picker offers for `query`, best matches first. The names are
 * read once per locale (`GET /lang/names`, a few bytes per language) and
 * ranked here, so typing never waits for the network.
 */
export function useLangSearch({
  query,
  active = true,
}: Options): LangSearchResult {
  const locale = useLocale();

  const { data, error, isLoading } = useQuery({
    // The translated exonyms make the list depend on the locale.
    queryKey: ['langs', 'names', { active, locale }],
    queryFn: async () => {
      const { success, error, result } = await getLanguageNames({
        active: active === 'all' ? undefined : active,
      });

      if (!success) {
        throw new Error(error);
      }

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });

  const searchable = useMemo(
    () => data?.map(item => ({ item, terms: searchTerms(item) })),
    [data],
  );

  const matches = useMemo(
    () => searchable && rankByQuery(searchable, query),
    [searchable, query],
  );

  return { data: matches, error, isLoading };
}
