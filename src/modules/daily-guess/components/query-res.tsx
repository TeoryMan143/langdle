'use client';

import Loading from '@/core/components/icons/loading';
import { Language } from '@/core/lib/types';
import LangImage from '@/modules/lang-data/components/lang-image';

type Props = {
  langs: Language[] | undefined;
  loading: boolean;
  error: boolean;
  onSelect: (lang: Language) => void;
};

function QueryRes({ langs, loading, error, onSelect }: Props) {
  return (
    <ul className='hidden absolute top-[calc(100%+0.3rem)] w-full rounded-lg h-40 overflow-y-scroll bg-white z-10 border-2 group-focus-within/langs:block'>
      {!error && langs?.length === 0 && (
        <li className='h-full grid place-content-center'>Language not found</li>
      )}
      {error && <li className='h-full'>Unknown error</li>}
      {loading && (
        <li className='h-full grid place-content-center'>
          <Loading className='text-4xl' />
        </li>
      )}
      {langs?.map(lang => {
        const { id, name, exonym } = lang;

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
              <LangImage code={id} /> {name} {exonym && `(${exonym})`}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default QueryRes;
