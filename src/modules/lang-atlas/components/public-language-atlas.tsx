'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import Loading from '@/core/components/icons/loading';
import LoadingRegion from '@/core/components/main/loading-region';
import { Input } from '@/core/components/ui/input';
import { TooltipProvider } from '@/core/components/ui/tooltip';
import { cn } from '@/core/lib/utils';
import type { LangFeatures } from '@/core/types';
import LoadMore from '@/modules/lang-data/components/load-more';
import {
  LANG_SEARCH_DEBOUNCE_MS,
  useLangPages,
} from '@/modules/lang-data/hooks/use-lang-pages';
import type { LanguagePage, LanguagePageSort } from '@/modules/lang-data/types';
import ChangeRequestDialog from '@/modules/lang-requests/components/change-request-dialog';
import type { ChangeRequestPayload } from '@/modules/lang-requests/types';
import type { LanguageCardHandles } from '../types';
import FeatureDescriptionTooltip from './feature-description-tooltip';
import LanguageCard from './language-card';
import LanguageCardSkeleton from './language-card-skeleton';

type Props = {
  /**
   * The first batch, read by the server. The catalogue holds thousands of
   * languages, so the next batches (of the same size) are only read as the
   * user scrolls.
   */
  initialPage: LanguagePage;
  pageSize: number;
  /** The order of the batches, `initialPage`'s included. */
  sort: LanguagePageSort;
};

/**
 * The searchable, paged list of every language. It owns the single change
 * request dialog and feature tooltip that all the cards' chips open.
 */
function PublicLanguageAtlas({ initialPage, pageSize, sort }: Props) {
  const t = useTranslations('PublicDataPage');
  const [input, setInput] = useState('');
  // One dialog and one tooltip serve every chip of every card.
  const [handles] = useState<LanguageCardHandles>(() => ({
    dialog: DialogPrimitive.createHandle<ChangeRequestPayload>(),
    tooltip: TooltipPrimitive.createHandle<LangFeatures>(),
  }));
  const [query, setQuery] = useDebounceValue('', LANG_SEARCH_DEBOUNCE_MS);

  const {
    data,
    isError,
    isPlaceholderData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLangPages({
    limit: pageSize,
    sort,
    query,
    initialPage,
  });

  const languages = data?.pages.flatMap(page => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const searching = input.trim() !== query.trim() || isPlaceholderData;

  return (
    <TooltipProvider>
      <section className='space-y-4'>
        <ChangeRequestDialog handle={handles.dialog} />
        <FeatureDescriptionTooltip handle={handles.tooltip} />

        <div className='rounded-base border-2 border-border bg-background p-4 shadow-shadow'>
          <label
            className='mb-2 flex items-center gap-2 text-sm font-base'
            htmlFor='public-lang-search'
          >
            {t('search.label')}
            {searching && <Loading className='size-4' />}
          </label>
          <Input
            id='public-lang-search'
            value={input}
            onChange={event => {
              setInput(event.target.value);
              setQuery(event.target.value);
            }}
            placeholder={t('search.placeholder')}
          />
        </div>

        {isError && !data ? (
          <div className='rounded-base border-2 border-border bg-background p-8 text-center shadow-shadow'>
            <p className='text-lg font-base'>{t('loadError')}</p>
          </div>
        ) : languages.length === 0 && !searching ? (
          <div className='rounded-base border-2 border-border bg-background p-8 text-center shadow-shadow'>
            <p className='text-lg font-base'>{t('empty')}</p>
          </div>
        ) : languages.length === 0 ? (
          // A search that starts from no results has nothing to keep on screen.
          <LoadingRegion className='grid gap-5 xl:grid-cols-2'>
            <LanguageCardSkeleton />
            <LanguageCardSkeleton />
          </LoadingRegion>
        ) : (
          <>
            {/* The previous results stay, dimmed, while a search loads. */}
            <div
              aria-busy={searching}
              className={cn(
                'grid gap-5 transition-opacity xl:grid-cols-2',
                searching && 'opacity-60',
              )}
            >
              {languages.map(language => (
                <LanguageCard
                  key={language.id}
                  language={language}
                  handles={handles}
                />
              ))}
              {isFetchingNextPage && (
                <LoadingRegion className='contents'>
                  <LanguageCardSkeleton />
                  <LanguageCardSkeleton />
                </LoadingRegion>
              )}
            </div>

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
          </>
        )}
      </section>
    </TooltipProvider>
  );
}

export default PublicLanguageAtlas;
