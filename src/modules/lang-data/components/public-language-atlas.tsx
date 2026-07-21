'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import FeatureToolTip from '@/core/components/main/feature-tooltip';
import { Input } from '@/core/components/ui/input';
import type { LangFeatures, Language } from '@/core/lib/types';
import { cn, groupedLangFeatures } from '@/core/lib/utils';
import LangImage from './lang-image';

type Props = {
  languages: Language[];
};

const groupedEntries = Object.entries(groupedLangFeatures) as Array<
  [keyof typeof groupedLangFeatures, readonly LangFeatures[]]
>;

function FeatureChip({
  feature,
  tone,
}: {
  feature: LangFeatures;
  tone: 'present' | 'partial' | 'absent';
}) {
  const t = useTranslations('Features.name');

  return (
    <FeatureToolTip feature={feature}>
      <button
        type='button'
        data-feature={feature}
        data-state={tone}
        className={cn(
          'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer',
          tone === 'present' &&
            'border-emerald-600 bg-emerald-100 text-emerald-950',
          tone === 'partial' && 'border-amber-500 bg-amber-100 text-amber-950',
          tone === 'absent' &&
            'border-border bg-secondary-background text-foreground/65 opacity-80',
        )}
      >
        {t(feature)}
      </button>
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
                  <FeatureChip key={feature} feature={feature} tone='present' />
                ))}
                {partial.map(feature => (
                  <FeatureChip key={feature} feature={feature} tone='partial' />
                ))}
                {absent.map(feature => (
                  <FeatureChip key={feature} feature={feature} tone='absent' />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function PublicLanguageAtlas({ languages }: Props) {
  const t = useTranslations('PublicDataPage');
  const [query, setQuery] = useState('');

  const filteredLanguages = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return languages;
    }

    return languages.filter(language => {
      const haystack = [language.id, language.name, language.exonym ?? '']
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [languages, query]);

  return (
    <section className='space-y-4'>
      <div className='rounded-2xl border-2 border-border bg-background p-4 shadow-shadow'>
        <label
          className='mb-2 block text-sm font-medium'
          htmlFor='public-lang-search'
        >
          {t('search.label')}
        </label>
        <Input
          id='public-lang-search'
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={t('search.placeholder')}
        />
      </div>

      {filteredLanguages.length === 0 ? (
        <div className='rounded-2xl border-2 border-border bg-background p-8 text-center shadow-shadow'>
          <p className='text-lg font-medium'>{t('empty')}</p>
        </div>
      ) : (
        <div className='grid gap-5 xl:grid-cols-2'>
          {filteredLanguages.map(language => (
            <LanguageCard key={language.id} language={language} />
          ))}
        </div>
      )}
    </section>
  );
}

export default PublicLanguageAtlas;
