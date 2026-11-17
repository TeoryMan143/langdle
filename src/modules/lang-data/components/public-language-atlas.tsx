'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import Loading from '@/core/components/icons/loading';
import FeatureToolTip from '@/core/components/main/feature-tooltip';
import { Input } from '@/core/components/ui/input';
import { groupedLangFeatures } from '@/core/lib/features';
import type { LangFeatures, Language } from '@/core/types';
import ChangeRequestDialog from '@/modules/lang-data/components/change-request-dialog';
import { useLangPages } from '../hooks/use-lang-pages';
import type { LanguagePage } from '../types';
import LangImage from './lang-image';
import LoadMore from './load-more';

type Props = {
  /**
   * The first batch, read by the server. The catalogue holds thousands of
   * languages and each card carries a dialog per feature, so the next batches
   * (of the same size) are only read as the user scrolls.
   */
  initialPage: LanguagePage;
  pageSize: number;
};

/** Wait for a pause in the typing before asking the API. */
const SEARCH_DEBOUNCE_MS = 300;

const groupedEntries = Object.entries(groupedLangFeatures) as Array<
  [keyof typeof groupedLangFeatures, readonly LangFeatures[]]
>;

function FeatureChip({
  lang,
  feature,
  tone,
}: {
  lang: string;
  feature: LangFeatures;
  tone: 'present' | 'partial' | 'absent';
}) {
  return (
    <FeatureToolTip feature={feature}>
      <ChangeRequestDialog lang={lang} feature={feature} status={tone} />
    </FeatureToolTip>
  );
}

function LanguageCard({ language }: { language: Language }) {
  const t = useTranslations('PublicDataPage');

  const presentFeatures = new Set(language.features);
  const partialFeatures = new Set(language.partial);

  return (
    <article className='rounded-[1.75rem] border-2 border-border bg-background p-5 shadow-shadow'>
      <header className='flex flex-col gap-4 md:gap-10 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex items-start gap-4'>
          <LangImage code={language.id} className='mt-1 h-8 w-11 rounded-sm' />
          <div>
            <h2 className='text-2xl font-semibold'>{language.name}</h2>
            {language.exonym && (
              <p className='mt-1 text-sm text-foreground/70'>
                {language.exonym}
              </p>
            )}
            {language.family && (
              <p className='mt-1 text-xs text-foreground/60'>
                {/* An isolate is its own family and branch: say it once. */}
                {[...new Set([language.family, language.genus])]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>
        </div>

        <div className='flex flex-wrap gap-2 text-sm'>
          <span className='rounded-full border border-border bg-main px-3 py-1 font-medium text-main-foreground'>
            {language.active ? t('status.active') : t('status.inactive')}
          </span>
          <span className='rounded-full border border-border bg-secondary-background px-3 py-1 font-medium'>
            {language.features.length} {t('summary.activeFeatures')}
          </span>
          <span className='rounded-full border border-border bg-secondary-background px-3 py-1 font-medium'>
            {language.partial.length} {t('summary.partialFeatures')}
          </span>
        </div>
      </header>

      <div className='mt-5 grid gap-4'>
        {groupedEntries.map(([group, features]) => {
          const present = features.filter(feature =>
            presentFeatures.has(feature),
          );
          const partial = features.filter(feature =>
            partialFeatures.has(feature),
          );
          const absent = features.filter(
            feature =>
              !presentFeatures.has(feature) && !partialFeatures.has(feature),
          );

          if (!present.length && !partial.length && !absent.length) {
            return null;
          }

          return (
            <section
              key={group}
              className='rounded-2xl border border-border/70 p-4'
            >
              <h3 className='text-base font-semibold'>
                {t(`groups.${group}`)}
              </h3>
              <div className='mt-3 flex flex-wrap gap-2'>
                {present.map(feature => (
                  <FeatureChip
                    key={feature}
                    feature={feature}
                    tone='present'
                    lang={language.id}
                  />
                ))}
                {partial.map(feature => (
                  <FeatureChip
                    key={feature}
                    feature={feature}
                    tone='partial'
                    lang={language.id}
                  />
                ))}
                {absent.map(feature => (
                  <FeatureChip
                    key={feature}
                    feature={feature}
                    tone='absent'
                    lang={language.id}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function PublicLanguageAtlas({ initialPage, pageSize }: Props) {
  const t = useTranslations('PublicDataPage');
  const [input, setInput] = useState('');
  const [query, setQuery] = useDebounceValue('', SEARCH_DEBOUNCE_MS);

  const {
    data,
    isError,
    isPlaceholderData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLangPages({ limit: pageSize, query, initialPage });

  const languages = data?.pages.flatMap(page => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const searching = input.trim() !== query.trim() || isPlaceholderData;

  return (
    <section className='space-y-4'>
      <div className='rounded-2xl border-2 border-border bg-background p-4 shadow-shadow'>
        <label
          className='mb-2 flex items-center gap-2 text-sm font-medium'
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
        <div className='rounded-2xl border-2 border-border bg-background p-8 text-center shadow-shadow'>
          <p className='text-lg font-medium'>{t('loadError')}</p>
        </div>
      ) : languages.length === 0 && !searching ? (
        <div className='rounded-2xl border-2 border-border bg-background p-8 text-center shadow-shadow'>
          <p className='text-lg font-medium'>{t('empty')}</p>
        </div>
      ) : (
        <>
          <div className='grid gap-5 xl:grid-cols-2'>
            {languages.map(language => (
              <LanguageCard key={language.id} language={language} />
            ))}
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
  );
}

export default PublicLanguageAtlas;
