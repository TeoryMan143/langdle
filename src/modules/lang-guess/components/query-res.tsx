'use client';

import { useTranslations } from 'next-intl';
import LoadingRegion from '@/core/components/main/loading-region';
import LangImage from '@/modules/lang-data/components/lang-image';
import LangRowSkeleton from '@/modules/lang-data/components/lang-row-skeleton';
import type { LanguageName } from '@/modules/lang-data/types';
import { useGame } from '../hooks/use-game';

type Props = {
  onSelect: (lang: LanguageName) => void;
};

function QueryRes({ onSelect }: Props) {
  const t = useTranslations('Game');
  const exo = useTranslations('Exonyms');

  const {
    langSearchData: { data: langs, error, isLoading: loading },
  } = useGame();

  return (
    <ul className='hidden absolute top-[calc(100%+0.3rem)] w-full rounded-base h-40 overflow-y-scroll bg-white z-10 border-2 group-focus-within/langs:block'>
      {!error && langs?.length === 0 && (
        <li className='h-full grid place-content-center'>
          {t('langNotFound')}
        </li>
      )}
      {error && <li className='h-full'>{t('unkError')}</li>}
      {loading && (
        <li>
          <LoadingRegion className='space-y-1'>
            {[0, 1, 2, 3].map(index => (
              <LangRowSkeleton
                key={index}
                index={index}
                className='justify-center py-2'
              />
            ))}
          </LoadingRegion>
        </li>
      )}
      {langs?.map(lang => {
        const { id, name } = lang;

        return (
          <li
            className='flex justify-center relative group overflow-hidden'
            key={id}
          >
            <div className='absolute h-[105%] bg-main w-full scale-x-0 group-hover:scale-100 transition-transform duration-250 z-20' />
            <button
              onClick={() => onSelect(lang)}
              className='text-sm md:text-base flex gap-2 justify-center py-2 cursor-pointer bg-none realtive z-30 size-full'
            >
              <LangImage code={id} /> {name} (
              {exo.has(id) ? exo(id) : (lang.exonym ?? name)})
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default QueryRes;
