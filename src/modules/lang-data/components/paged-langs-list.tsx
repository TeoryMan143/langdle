'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import Loading from '@/core/components/icons/loading';
import { Input } from '@/core/components/ui/input';
import { LANG_SEARCH_DEBOUNCE_MS, useLangPages } from '../hooks/use-lang-pages';
import type { LanguagePage } from '../types';
import LangListItem from './lang-list-item';
import LoadMore from './load-more';

type Props = {
  /** The first batch, read by the server; the next ones have its size. */
  initialPage: LanguagePage;
  pageSize: number;
};

/**
 * Every language, for administrators, loaded batch by batch as they scroll,
 * with a search the API ranks (`?q=`) once the typing pauses.
 */
function PagedLangsList({ initialPage, pageSize }: Props) {
  const t = useTranslations('ListPage');
  const [input, setInput] = useState('');
  const [query, setQuery] = useDebounceValue('', LANG_SEARCH_DEBOUNCE_MS);

  const {
    data,
    isPlaceholderData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLangPages({ limit: pageSize, query, initialPage });

  const languages = data?.pages.flatMap(page => page.items) ?? [];
  const searching = input.trim() !== query.trim() || isPlaceholderData;

  return (
    <div className='flex w-full max-w-xl flex-col items-stretch gap-4 px-10 lg:px-0'>
      <div className='relative'>
        <Input
          value={input}
          onChange={event => {
            setInput(event.target.value);
            setQuery(event.target.value);
          }}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
        />
        {searching && (
          <Loading className='absolute top-1/2 right-3 size-5 -translate-y-1/2' />
        )}
      </div>

      {languages.length > 0 ? (
        <div className='bg-background rounded-2xl border border-black overflow-clip'>
          {languages.map(language => (
            <LangListItem key={language.id} language={language} />
          ))}
        </div>
      ) : (
        !searching && (
          <p className='rounded-2xl border border-black bg-background p-6 text-center'>
            {t('noMatches')}
          </p>
        )
      )}

      <LoadMore
        hasNextPage={hasNextPage && !isPlaceholderData}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        label={t('showMore')}
      />
    </div>
  );
}

export default PagedLangsList;
