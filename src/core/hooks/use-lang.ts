import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { distance } from 'fastest-levenshtein';
import { getDailyLanguage } from '@/modules/lang-guess/actions';
import {
  getAllActiveLanguages,
  getAllLanguages,
  getLanguage,
  getLanguagesByIds,
  setLanguageData,
} from '../actions/langs';
import type { Language, LanguageData } from '../lib/types';

type GetAllLanguages = {
  action: 'get';
  langs?: never;
  lang?: never;
  data?: never;
  query?: never;
  onlyActives?: boolean;
};

type GetLanguageByCode = {
  action: 'get';
  langs?: never;
  lang: string;
  data?: never;
  query?: never;
  onlyActives?: never;
};

type GetLanguageByCodes = {
  action: 'get';
  langs?: string[];
  lang?: never;
  data?: never;
  query?: never;
  onlyActives?: never;
};

type GetLanguagesbySearch = {
  action: 'search';
  langs?: never;
  lang?: never;
  query: string;
  data?: never;
  onlyActives?: never;
};

type ModifyLanguage = {
  action: 'modify';
  langs?: never;
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
export function useLang(
  options: GetLanguageByCodes,
): UseQueryResult<Language[]>;

export function useLang(
  options:
    | GetAllLanguages
    | GetLanguageByCode
    | ModifyLanguage
    | GetLanguagesbySearch
    | GetLanguageByCodes,
) {
  const { action, lang, data, query, onlyActives = false, langs } = options;

  return useQuery({
    queryKey: ['langs', action, lang, query, langs],
    queryFn: async () => {
      if (action === 'get' && lang === undefined && langs === undefined) {
        const { success, error, result } = onlyActives
          ? await getAllActiveLanguages()
          : await getAllLanguages();

        if (!success) {
          throw new Error(error);
        }

        return result;
      }

      if (action === 'get' && lang === 'daily') {
        const { success, error, result } = await getDailyLanguage();

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
      if (action === 'get' && langs) {
        const { success, error, result } = await getLanguagesByIds(langs);

        if (!success) {
          throw new Error(error);
        }

        return result;
      }
      if (action === 'search' && query !== undefined) {
        const { success, error, result: langs } = await getAllActiveLanguages();

        if (!success) {
          throw new Error(error);
        }

        if (query.length === 0) {
          return langs;
        }

        const result = langs
          .map(lang => ({
            ...lang,
            score: Math.min(
              ...lang.searchParams.map(param => distance(query, param)),
            ),
          }))
          .sort((a, b) => a.score - b.score);

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
