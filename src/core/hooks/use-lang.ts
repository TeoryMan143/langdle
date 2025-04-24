import { useQuery, UseQueryResult } from '@tanstack/react-query';
import type { LanguageCode, Language, LanguageData } from '../lib/types';
import {
  getAllLanguages,
  getLanguage,
  setLanguageData,
} from '../actions/langs';

type GetAllLanguages = {
  action: 'get';
  lang?: never;
  data?: never;
};

type GetLanguageByCode = {
  action: 'get';
  lang: LanguageCode;
  data?: never;
};

type ModifyLanguage = {
  action: 'modify';
  lang: LanguageCode;
  data: LanguageData;
};

export function useLang(options: GetAllLanguages): UseQueryResult<Language[]>;
export function useLang(options: GetLanguageByCode): UseQueryResult<Language>;
export function useLang(
  options: ModifyLanguage,
): UseQueryResult<{ message: string; success: true }>;

// Implementation
export function useLang(
  options: GetAllLanguages | GetLanguageByCode | ModifyLanguage,
) {
  const { action, lang, data } = options;

  return useQuery({
    queryKey: ['langs', action, lang],
    queryFn: async () => {
      if (action === 'get' && lang === undefined) {
        const { success, error, result } = await getAllLanguages();

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
