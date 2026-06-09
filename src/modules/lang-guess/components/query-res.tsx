'use client';

import { useTranslations } from 'next-intl';
import Loading from '@/core/components/icons/loading';
import { Language } from '@/core/lib/types';
import LangImage from '@/modules/lang-data/components/lang-image';
import { useGame } from '../hooks/use-game';

type Props = {
  onSelect: (lang: Language) => void;
};

function QueryRes({ onSelect }: Props) {
  const t = useTranslations('Game');
  const exo = useTranslations('Exonyms');

  const {
    langSearchData: { data: langs, error, isLoading: loading },
  } = useGame();

  console.log(error);

  return (
    <ul className='hidden absolute top-[calc(100%+0.3rem)] w-full rounded-lg h-40 overflow-y-scroll bg-white z-10 border-2 group-focus-within/langs:block'>
      {!error && langs?.length === 0 && (
        <li className='h-full grid place-content-center'>
          {t('langNotFound')}
        </li>
      )}
      {error && <li className='h-full'>{t('unkError')}</li>}
      {loading && (
        <li className='h-full grid place-content-center'>
          <Loading className='text-4xl' />
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
              <LangImage code={id} /> {name} ({exo(id)})
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default QueryRes;
