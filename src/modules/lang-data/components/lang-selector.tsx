'use client';

import { ChevronsUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import Loading from '@/core/components/icons/loading';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/core/components/ui/popover';
import { useLang } from '@/core/hooks/use-lang';
import type { Language } from '@/core/lib/types';
import LangImage from './lang-image';

export default function LangSelector({
  onValueChange,
}: {
  onValueChange?: (value: Language) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [value, setValue] = React.useState<Language | null>(null);

  const {
    data: langs,
    isLoading: loading,
    error,
  } = useLang({
    action: 'search',
    query,
  });

  React.useEffect(() => {
    if (onValueChange && value) {
      onValueChange(value);
    }
  }, [onValueChange, value]);

  const t = useTranslations('Game');
  const exo = useTranslations('Exonyms');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='noShadow'
          // biome-ignore lint/a11y/useSemanticElements: custom component
          role='combobox'
          aria-expanded={open}
          className='w-56 justify-between md:max-w-[200px]'
          disabled={loading}
        >
          {langs
            ? langs.find(lang => lang.id === value?.id)?.name
            : 'Select language...'}
          <ChevronsUpDown />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-(--radix-popover-trigger-width) border-0 p-0'>
        <Input onChange={e => setQuery(e.target.value)} />
        <ul className='top-[calc(100%+0.3rem)] w-full rounded-lg h-40 overflow-y-scroll bg-white z-10 border-2 p-2'>
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
                  onClick={() => setValue(lang)}
                  className='text-sm flex gap-2 justify-center py-2 cursor-pointer bg-none realtive z-30 size-full'
                >
                  <LangImage code={id} /> {name} ({exo(id)})
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
