'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import LoadingRegion from '@/core/components/main/loading-region';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/core/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { useLangLabel } from '../hooks/use-lang-label';
import { useLangSearch } from '../hooks/use-lang-search';
import type { LanguageName } from '../types';
import LangImage from './lang-image';
import LangRowSkeleton from './lang-row-skeleton';

/** Rendering every language (thousands) on open would be slow to no end. */
const MAX_RESULTS = 50;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Languages not offered (the ones already chosen). */
  excluded?: string[];
  /** Called with the chosen language; the dialog closes right after. */
  onPick: (language: LanguageName) => void;
  /** Which part of the catalogue to offer: every language by default. */
  active?: boolean | 'all';
};

/**
 * A dialog to choose one language, searched with the game's ranking (accents,
 * typos, the translated names). The mobile app's `showLanguagePicker`.
 */
function LangPickerDialog({
  open,
  onOpenChange,
  title,
  excluded = [],
  onPick,
  active = 'all',
}: Props) {
  const [query, setQuery] = useState('');
  const t = useTranslations('Game');
  const searchT = useTranslations('PublicDataPage.search');
  const label = useLangLabel();
  const { data, error, isLoading } = useLangSearch({ query, active });

  const matches = useMemo(
    () =>
      data?.filter(lang => !excluded.includes(lang.id)).slice(0, MAX_RESULTS),
    [data, excluded],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        onOpenChange(next);
        if (!next) setQuery('');
      }}
    >
      <DialogContent className='gap-3'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false} className='rounded-base'>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={searchT('placeholder')}
            aria-label={searchT('label')}
          />
          <CommandList className='max-h-72 p-2'>
            {isLoading && (
              <LoadingRegion className='space-y-1'>
                {[0, 1, 2, 3, 4].map(index => (
                  <LangRowSkeleton
                    key={index}
                    index={index}
                    className='px-2 py-2'
                  />
                ))}
              </LoadingRegion>
            )}
            {error && (
              <p className='py-6 text-center text-sm'>{t('unkError')}</p>
            )}
            {!isLoading && !error && (
              <CommandEmpty>{t('langNotFound')}</CommandEmpty>
            )}
            {matches?.map(lang => (
              <CommandItem
                key={lang.id}
                value={lang.id}
                onSelect={() => {
                  onPick(lang);
                  onOpenChange(false);
                  setQuery('');
                }}
                className='cursor-pointer py-2'
              >
                <LangImage code={lang.id} />
                <span className='min-w-0'>{label(lang)}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default LangPickerDialog;
