'use client';

import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { useDebounceValue } from 'usehooks-ts';
import Loading from '@/core/components/icons/loading';
import { Button, buttonVariants } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import type { Language } from '@/core/types';
import { Link } from '@/i18n/navigation';
import { setLangStatus } from '../actions';
import { langPagesKey, useLangPages } from '../hooks/use-lang-pages';
import type { LanguagePage } from '../types';
import LangImage from './lang-image';
import LoadMore from './load-more';

/** Wait for a pause in the typing before asking the API. */
const SEARCH_DEBOUNCE_MS = 300;

type Props = {
  /** The first batch of the queue, read by the server. */
  initialPage: LanguagePage;
  pageSize: number;
};

/**
 * The inactive languages an administrator still has to review, best described
 * first, each with a link to its editor and a one-click activation. Read batch
 * by batch as the administrator scrolls.
 */
function ReviewQueue({ initialPage, pageSize }: Props) {
  const t = useTranslations('ReviewPage');
  const langT = useTranslations('LangData');
  const queryClient = useQueryClient();

  const [input, setInput] = useState('');
  const [query, setQuery] = useDebounceValue('', SEARCH_DEBOUNCE_MS);
  const [activating, setActivating] = useState<string | null>(null);

  const listing = {
    limit: pageSize,
    active: false,
    sort: 'coverage',
    query,
  } as const;
  const {
    data,
    isPlaceholderData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLangPages({ ...listing, initialPage });

  const languages = data?.pages.flatMap(page => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const searching = input.trim() !== query.trim() || isPlaceholderData;

  const activate = async (language: Language) => {
    setActivating(language.id);
    const res = await setLangStatus(language.id, true);
    setActivating(null);

    if (!res.success) {
      return toast.error(langT(res.error));
    }

    // The language leaves this queue at once; the cursors stay valid, since
    // they point at languages, not at positions.
    queryClient.setQueryData<InfiniteData<LanguagePage, string | null>>(
      langPagesKey(listing),
      current =>
        current && {
          ...current,
          pages: current.pages.map(page => ({
            ...page,
            items: page.items.filter(({ id }) => id !== language.id),
            total: page.total - 1,
          })),
        },
    );
    // Every other listing (the atlas, a search of this queue) is now stale.
    queryClient.invalidateQueries({
      queryKey: ['langs'],
      refetchType: 'none',
    });
    toast.success(t('activated', { name: language.exonym ?? language.name }));
  };

  if (total === 0 && !query && !input) {
    return (
      <p className='rounded-base border-2 border-border bg-secondary-background p-8 text-center shadow-shadow'>
        {t('empty')}
      </p>
    );
  }

  return (
    <section className='space-y-4'>
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

      {languages.length > 0 && (
        <ul className='divide-y-2 divide-border overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-shadow'>
          {languages.map(language => (
            <li
              key={language.id}
              className='flex flex-wrap items-center gap-3 px-4 py-3'
            >
              <LangImage code={language.id} className='h-6 w-9' />
              <div className='min-w-40 flex-1'>
                <p className='font-heading'>
                  {language.name}
                  {language.exonym && ` (${language.exonym})`}
                </p>
                <p className='text-xs text-foreground/70'>
                  {[language.id, ...new Set([language.family, language.genus])]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <span className='rounded-base border-2 border-border bg-background px-2 py-0.5 text-sm'>
                {language.coverage === undefined
                  ? t('noCoverage')
                  : t('coverage', {
                      percent: Math.round(language.coverage * 100),
                    })}
              </span>
              <Link
                className={buttonVariants({ variant: 'neutral', size: 'sm' })}
                href={`/data/${language.id}`}
              >
                {t('inspect')}
              </Link>
              <Button
                size='sm'
                disabled={activating !== null}
                onClick={() => activate(language)}
              >
                {activating === language.id ? <Loading /> : t('activate')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className='flex flex-col items-center gap-3'>
        <p className='text-sm text-foreground/70'>
          {t('showing', { shown: languages.length, total })}
        </p>
        <LoadMore
          hasNextPage={hasNextPage && !isPlaceholderData}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
          label={t('showMore')}
        />
      </div>
    </section>
  );
}

export default ReviewQueue;
