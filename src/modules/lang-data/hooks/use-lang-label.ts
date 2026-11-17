import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import type { LanguageName } from '../types';

/**
 * `Name (Exonym)`, the exonym translated into the current locale when the
 * `Exonyms` messages have it, the name alone when both are the same. The
 * mobile app's `Language.label`.
 */
export function useLangLabel() {
  const exo = useTranslations('Exonyms');

  return useCallback(
    ({ id, name, exonym }: Pick<LanguageName, 'id' | 'name' | 'exonym'>) => {
      const translated = exo.has(id) ? exo(id) : exonym;

      return translated && translated !== name
        ? `${name} (${translated})`
        : name;
    },
    [exo],
  );
}
