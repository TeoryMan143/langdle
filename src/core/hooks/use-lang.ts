import { UseQueryResult, useQuery } from '@tanstack/react-query';
import {
  getAllActiveLanguages,
  getAllLanguages,
  getLanguage,
  getLanguagesBySearch,
  setLanguageData,
} from '../actions/langs';
import type { Language, LanguageData } from '../lib/types';

type GetAllLanguages = {
  action: 'get';
  lang?: never;
  data?: never;
  query?: never;
  onlyActives?: boolean;
};

type GetLanguageByCode = {
  action: 'get';
  lang: string;
  data?: never;
  query?: never;
  onlyActives?: never;
};

type GetLanguagesbySearch = {
  action: 'search';
  lang?: never;
  query: string;
  data?: never;
  onlyActives?: never;
};

type ModifyLanguage = {
  action: 'modify';
  lang: string;
  data: LanguageData;
  query?: never;
  onlyActives?: never;
};

export function useLang(options: GetAllLanguages): UseQueryResult<Language[]>;
export function useLang(options: GetLanguageByCode): UseQueryResult<Language>;
export function useLang(
  options: ModifyLanguage,
): UseQueryResult<{ message: string; success: true }>;
export function useLang(
  options: GetLanguagesbySearch,
): UseQueryResult<Language[]>;

// Implementation
export function useLang(
  options:
    | GetAllLanguages
    | GetLanguageByCode
    | ModifyLanguage
    | GetLanguagesbySearch,
) {
  const { action, lang, data, query, onlyActives = false } = options;

  return useQuery({
    queryKey: ['langs', action, lang, query],
    queryFn: async () => {
      if (action === 'get' && lang === undefined) {
        const { success, error, result } = onlyActives
          ? await getAllActiveLanguages()
          : await getAllLanguages();

        if (!success) {
          throw new Error(error);
        }

        return result;
      }
      if (action === 'get' && lang) {
        const { success, error, result } = await getLanguage(lang);

        if (!success) {
          throw new Error(error);
        }

        return result;
      }
      if (action === 'search' && query !== undefined) {
        if (query === '') {
          return [];
        }

        const { success, error, result } = await getLanguagesBySearch(query);

        if (!success) {
          throw new Error(error);
        }

        return result;
      }
      if (action === 'modify' && lang && data) {
        const { success, error, result } = await setLanguageData(lang, data);

        if (!success) {
          throw new Error(error);
        }

        return { success, message: result };
      }

      throw new Error('Invalid options');
    },
  });
}
